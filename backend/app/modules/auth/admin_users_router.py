import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.deps import require_super_admin
from app.core.security import hash_password
from app.db.session import get_db
from app.modules.auth.models import AdminRole, AdminUser
from app.modules.auth.schemas import AdminUserOut

router = APIRouter(
    prefix="/super/admin-users", tags=["super-admin"], dependencies=[Depends(require_super_admin)]
)


class AdminUserCreate(BaseModel):
    tenant_id: Optional[int] = None
    name: str
    email: EmailStr
    username: str
    password: str
    role: AdminRole


class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


@router.get("", response_model=list[AdminUserOut])
def list_admin_users(db: Session = Depends(get_db)):
    return db.query(AdminUser).filter(AdminUser.deleted_at.is_(None)).order_by(AdminUser.name).all()


@router.post("", response_model=AdminUserOut, status_code=status.HTTP_201_CREATED)
def create_admin_user(payload: AdminUserCreate, db: Session = Depends(get_db)):
    if payload.role == AdminRole.tenant_admin and payload.tenant_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "tenant_admin requires a tenant_id")
    if payload.role == AdminRole.super_admin and payload.tenant_id is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "super_admin must not have a tenant_id")
    if db.query(AdminUser).filter(AdminUser.username == payload.username).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Username already in use")

    admin = AdminUser(
        tenant_id=payload.tenant_id,
        name=payload.name,
        email=payload.email,
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@router.patch("/{admin_id}", response_model=AdminUserOut)
def update_admin_user(admin_id: int, payload: AdminUserUpdate, db: Session = Depends(get_db)):
    admin = db.query(AdminUser).filter(AdminUser.id == admin_id, AdminUser.deleted_at.is_(None)).first()
    if admin is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Admin user not found")
    if payload.password:
        admin.password_hash = hash_password(payload.password)
    for field in ("name", "is_active"):
        value = getattr(payload, field)
        if value is not None:
            setattr(admin, field, value)
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@router.delete("/{admin_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_admin_user(admin_id: int, db: Session = Depends(get_db)):
    """Soft delete only, matching the one legacy table that used it."""
    admin = db.query(AdminUser).filter(AdminUser.id == admin_id, AdminUser.deleted_at.is_(None)).first()
    if admin is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Admin user not found")
    admin.deleted_at = datetime.datetime.now(datetime.timezone.utc)
    admin.is_active = False
    db.add(admin)
    db.commit()
