"""
Password hashing + JWT helpers.

JWT = a signed string that says "this is user X, valid until Y". The server
signs it with SECRET_KEY so if someone edits it the signature won't match.
We don't store sessions in the database, the token itself is the proof.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# bcrypt is slow on purpose which makes brute forcing hashes harder.
# (bcrypt is pinned to 4.0.1 in requirements.txt because newer versions break passlib)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    # subject is the user's email
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return jwt.encode({"sub": subject, "exp": expire}, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[str]:
    # returns the email if the token is valid, None if it's expired/tampered/garbage
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


# --- magic link stuff ---
# These were for the first version where you logged in by clicking a link
# sent to your email, before switching to email + password.
# Not called anywhere right now, just left them in.

def create_magic_token(email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.MAGIC_LINK_EXPIRE_MINUTES)
    return jwt.encode({"sub": email, "type": "magic", "exp": expire}, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_magic_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "magic":
            return None
        return payload.get("sub")
    except JWTError:
        return None


# --- passwords ---
# we never store the real password, only the hash

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
