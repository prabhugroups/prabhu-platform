from typing import Optional

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.mixins import TimestampMixin
from app.db.session import Base


class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    shareholder_module_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    # Branding — deliberately a small, flat set of columns (not a generic
    # key-value table) because every tenant has exactly one of each, always.
    primary_color: Mapped[str] = mapped_column(String(16), default="#0059ab")
    secondary_color: Mapped[str] = mapped_column(String(16), default="#17ad4c")
    primary_light_color: Mapped[str] = mapped_column(String(16), default="#4a90e2")
    font_family: Mapped[str] = mapped_column(String(64), default="Sansation")
    logo_file: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    favicon_file: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    default_og_image_file: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    footer_text: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    domains: Mapped[list["TenantDomain"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )


class TenantDomain(Base):
    __tablename__ = "tenant_domains"
    __table_args__ = (UniqueConstraint("hostname", name="uq_tenant_domains_hostname"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    hostname: Mapped[str] = mapped_column(String(255), index=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)

    tenant: Mapped["Tenant"] = relationship(back_populates="domains")
