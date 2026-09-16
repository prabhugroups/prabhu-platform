import datetime
import enum
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.mixins import TimestampMixin
from app.db.session import Base


class AdminRole(str, enum.Enum):
    super_admin = "super_admin"
    tenant_admin = "tenant_admin"


class AdminUser(Base, TimestampMixin):
    """Single admin-user table for both roles. super_admin rows have
    tenant_id NULL (cross-tenant); tenant_admin rows must have a tenant_id.
    Soft-delete only (matches the one table in the legacy schema that used it),
    enforced at the query layer via deleted_at IS NULL, not a DB trigger.
    """

    __tablename__ = "admin_users"
    __table_args__ = (
        CheckConstraint(
            "(role = 'super_admin' AND tenant_id IS NULL) OR "
            "(role = 'tenant_admin' AND tenant_id IS NOT NULL)",
            name="ck_admin_users_role_tenant",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), index=True, nullable=True
    )
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[AdminRole] = mapped_column(Enum(AdminRole))
    is_active: Mapped[bool] = mapped_column(default=True)
    deleted_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
