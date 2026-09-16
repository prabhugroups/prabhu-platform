from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.modules.auth.models import AdminRole, AdminUser
from app.modules.tenants.models import Tenant

_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> AdminUser:
    """Decodes the bearer JWT and loads the admin_users row it names. The
    token's tenant_id is the single source of truth for tenant scoping below
    — never a value the client passes separately."""
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    admin = (
        db.query(AdminUser)
        .filter(AdminUser.id == payload.sub, AdminUser.deleted_at.is_(None))
        .first()
    )
    if admin is None or not admin.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account not found or inactive")
    return admin


def require_super_admin(admin: AdminUser = Depends(get_current_admin)) -> AdminUser:
    if admin.role != AdminRole.super_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Super admin access required")
    return admin


def get_tenant_scope(
    admin: AdminUser = Depends(get_current_admin),
    x_tenant_id: Optional[int] = Header(default=None, alias="X-Tenant-Id"),
) -> int:
    """Resolves the tenant_id an authenticated request is allowed to act on.

    tenant_admin: ALWAYS their own admin.tenant_id from the JWT-verified row.
    Any X-Tenant-Id header they send is ignored outright — this is the
    server-side isolation guarantee, not merely a default.

    super_admin: must explicitly select a tenant via X-Tenant-Id to act
    "as" that tenant (e.g. editing its content); omitting it is only valid
    for the genuinely cross-tenant endpoints that don't call this dependency.
    """
    if admin.role == AdminRole.tenant_admin:
        return admin.tenant_id  # type: ignore[return-value]

    if x_tenant_id is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Super admin requests to tenant-scoped endpoints require X-Tenant-Id",
        )
    return x_tenant_id


def resolve_public_tenant(
    x_tenant_slug: str = Header(alias="X-Tenant-Slug"),
    db: Session = Depends(get_db),
) -> Tenant:
    """Public (unauthenticated) read endpoints resolve tenant from an explicit
    slug the frontend sets after its own Host-header lookup — never from a
    client-controllable Host header parsed inside FastAPI itself."""
    tenant = (
        db.query(Tenant)
        .filter(Tenant.slug == x_tenant_slug, Tenant.is_active.is_(True))
        .first()
    )
    if tenant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown tenant")
    return tenant
