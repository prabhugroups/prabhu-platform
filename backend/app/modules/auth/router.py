import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.core.rate_limit import login_rate_limiter
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.modules.auth.models import AdminUser
from app.modules.auth.schemas import (
    AdminUserOut,
    ChangePasswordRequest,
    LoginRequest,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])

logger = logging.getLogger("app.auth")


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    client_ip = request.client.host if request.client else "unknown"
    # Checked before touching the DB or hashing anything — the whole point
    # is to stop a credential-stuffing loop from spending bcrypt cycles or
    # DB round-trips once it's already past its budget for this
    # (ip, username) pair.
    login_rate_limiter.check(client_ip, payload.username)

    admin = (
        db.query(AdminUser)
        .filter(AdminUser.username == payload.username, AdminUser.deleted_at.is_(None))
        .first()
    )
    if (
        admin is None
        or not admin.is_active
        or not verify_password(payload.password, admin.password_hash)
    ):
        login_rate_limiter.record_failure(client_ip, payload.username)
        logger.warning("Failed login attempt: username=%s ip=%s", payload.username, client_ip)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    login_rate_limiter.record_success(client_ip, payload.username)
    token = create_access_token(subject=admin.id, role=admin.role.value, tenant_id=admin.tenant_id)
    return TokenResponse(access_token=token, role=admin.role.value, tenant_id=admin.tenant_id)


@router.get("/me", response_model=AdminUserOut)
def me(admin: AdminUser = Depends(get_current_admin)) -> AdminUser:
    return admin


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> None:
    if not verify_password(payload.current_password, admin.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")
    admin.password_hash = hash_password(payload.new_password)
    db.add(admin)
    db.commit()
