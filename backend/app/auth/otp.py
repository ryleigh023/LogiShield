import random
import string
import logging
from redis.asyncio import Redis
from app.config import settings

logger = logging.getLogger(__name__)

OTP_TTL_SECONDS = 300


async def generate_otp(email: str) -> str:
    otp = "".join(random.choices(string.digits, k=6))
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    await redis.setex(f"otp:{email}", OTP_TTL_SECONDS, otp)
    return otp


async def verify_otp(email: str, otp: str) -> bool:
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    stored = await redis.get(f"otp:{email}")
    if stored and stored == otp:
        await redis.delete(f"otp:{email}")
        return True
    return False


async def send_otp_email(email: str, otp: str) -> bool:
    has_mail_config = all([
        settings.mail_username,
        settings.mail_password,
        settings.mail_from,
        settings.mail_server,
    ])

    if not has_mail_config:
        logger.warning(f"[DEMO MODE] OTP for {email}: {otp}")
        return True

    try:
        from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

        conf = ConnectionConfig(
            MAIL_USERNAME=settings.mail_username,
            MAIL_PASSWORD=settings.mail_password,
            MAIL_FROM=settings.mail_from,
            MAIL_PORT=settings.mail_port,
            MAIL_SERVER=settings.mail_server,
            MAIL_STARTTLS=True,
            MAIL_SSL_TLS=False,
            USE_CREDENTIALS=True,
        )

        message = MessageSchema(
            subject="FreightSentinel — Your OTP",
            recipients=[email],
            body=f"Your one-time password is: {otp}\n\nValid for 5 minutes.",
            subtype=MessageType.plain,
        )

        fm = FastMail(conf)
        await fm.send_message(message)
        logger.info(f"OTP email sent to {email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send OTP email to {email}: {e}")
        logger.warning(f"[FALLBACK] OTP for {email}: {otp}")
        return True
