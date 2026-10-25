from datetime import datetime, timedelta, timezone
import secrets
from typing import Any

import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings


password_hash = PasswordHash.recommended()
# Verify an unknown account against a password hash too, reducing username timing differences.
_dummy_password_hash = password_hash.hash(secrets.token_urlsafe(32))


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str | None) -> bool:
    candidate_hash = hashed_password or _dummy_password_hash
    return password_hash.verify(password, candidate_hash) and hashed_password is not None


def create_access_token(user_id: int) -> tuple[str, int]:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expires_in = settings.access_token_expire_minutes * 60
    claims: dict[str, Any] = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(seconds=expires_in),
        "jti": secrets.token_urlsafe(16),
        "type": "access",
    }
    token = jwt.encode(claims, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, expires_in


def decode_access_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    claims = jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
        options={"require": ["sub", "iat", "exp", "jti", "type"]},
    )
    if claims.get("type") != "access":
        raise jwt.InvalidTokenError("Unexpected token type")
    return claims
