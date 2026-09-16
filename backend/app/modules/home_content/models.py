from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class HomeContent(Base):
    """Homepage 'Who are we?' rich-text block — one row per tenant."""

    __tablename__ = "home_content"
    __table_args__ = (UniqueConstraint("tenant_id", name="uq_home_content_tenant"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    about_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    highlighted_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class Stakeholder(Base):
    """Homepage 'Our Major Stake Holders' logo row."""

    __tablename__ = "stakeholders"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    logo_file: Mapped[str] = mapped_column(String(512))
    link: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Associate(Base):
    """Homepage 'Our Major Associates' logo row."""

    __tablename__ = "associates"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    logo_file: Mapped[str] = mapped_column(String(512))
    link: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Spokesperson(Base):
    """Homepage spokesperson card — one row per tenant, hidden unless `show`."""

    __tablename__ = "spokespersons"
    __table_args__ = (UniqueConstraint("tenant_id", name="uq_spokespersons_tenant"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    image: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    show: Mapped[bool] = mapped_column(Boolean, default=False)
