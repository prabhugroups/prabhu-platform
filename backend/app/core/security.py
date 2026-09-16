import datetime
from typing import Optional

import bcrypt
import jwt
from jwt import InvalidTokenError

from app.core.config import get_settings

settings = get_settings()

# passlib's CryptContext is unmaintained and breaks against bcrypt>=4.1 (its
# version-sniffing hits a removed `bcrypt.__about__` attribute); calling
# bcrypt directly avoids that whole compatibility class. bcrypt itself
# rejects (rather than silently truncates) secrets over 72 bytes, so that's
# done explicitly here.


def _truncate_72_bytes(password: str) -> bytes:
    return password.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_truncate_72_bytes(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(_truncate_72_bytes(password), password_hash.encode("utf-8"))


def create_access_token(*, subject: int, role: str, tenant_id: Optional[int]) -> str:
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
        minutes=settings.jwt_expires_minutes
    )
    payload = {"sub": str(subject), "role": role, "tenant_id": tenant_id, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


class TokenPayload:
    def __init__(self, sub: int, role: str, tenant_id: Optional[int]):
        self.sub = sub
        self.role = role
        self.tenant_id = tenant_id


def decode_access_token(token: str) -> Optional[TokenPayload]:
    try:
        data = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except InvalidTokenError:
        return None
    sub = data.get("sub")
    role = data.get("role")
    if sub is None or role is None:
        return None
    return TokenPayload(sub=int(sub), role=role, tenant_id=data.get("tenant_id"))
