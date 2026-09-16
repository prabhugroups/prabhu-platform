import enum
from typing import Optional

from sqlalchemy import Enum, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.mixins import TimestampMixin
from app.db.session import Base


class ApplicationStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Application(Base, TimestampMixin):
    """Public 'request to buy shares' / 'apply for membership' intake form,
    present in all 7 legacy tenants. Core columns are the fields every tenant
    actually uses; tenant-specific optional fields (bank info, preferred
    district, membership type, etc.) live in `extra` rather than as fixed
    columns — the legacy schema bolted these on via a shared migration file
    even for tenants where they made no business sense (e.g. an advocacy
    license number field on a cable-car company's form).
    """

    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    citizenship_file: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    bank_deposit_file: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    request_form_file: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    share_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    pan: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    nid: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus), default=ApplicationStatus.pending
    )
    extra: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
