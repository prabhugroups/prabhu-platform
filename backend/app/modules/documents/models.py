import datetime
from typing import Optional

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.mixins import TimestampMixin
from app.db.session import Base


class Document(Base, TimestampMixin):
    """Notices, AGM minutes, annual reports, and other disclosure PDFs."""

    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    file: Mapped[str] = mapped_column(String(512))
    type: Mapped[str] = mapped_column(String(64))  # e.g. "notice" | "legal" | "report"
    date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
