from cryptography.fernet import Fernet
import os

FERNET_KEY = os.getenv("FERNET_KEY", Fernet.generate_key())
fernet = Fernet(FERNET_KEY)

def encrypt_pii(value: str) -> str:
    return fernet.encrypt(value.encode()).decode()

def decrypt_pii(value: str) -> str:
    return fernet.decrypt(value.encode()).decode()
