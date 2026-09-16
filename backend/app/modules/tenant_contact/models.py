from typing import Optional

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class TenantContact(Base):
    """Site-wide contact/office info + social links shown in the header top
    strip, footer, and WhatsApp button — one row per tenant."""

    __tablename__ = "tenant_contacts"
    __table_args__ = (UniqueConstraint("tenant_id", name="uq_tenant_contacts_tenant"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    phone_primary: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    phone_secondary: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    opening_hours: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    whatsapp_number: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    registered_office: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    branch_office: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    copyright_text: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    map_file: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    facebook_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    instagram_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    youtube_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
