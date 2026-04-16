from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    database_url: str
    redis_url: str = "redis://localhost:6379"
    openai_api_key: str = ""
    openweather_api_key: str = ""
    news_api_key: str = ""
    secret_key: str = "change-me"
    environment: str = "development"

    # Mail settings — all optional, app works without them (demo mode)
    mail_username: Optional[str] = None
    mail_password: Optional[str] = None
    mail_from: Optional[str] = None
    mail_server: Optional[str] = "smtp.gmail.com"
    mail_port: int = 587

    class Config:
        env_file = ".env"

settings = Settings()
