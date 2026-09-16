from typing import Optional

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class PageSeo(Base):
    """Per-page meta title/description/keywords — one row per tenant per
    page. `page_key` is free text (e.g. "home", "about-overview") rather
    than an enum, same looseness as legacy's per-page SEO keys, since the
    set of pages differs per tenant/industry."""

    __tablename__ = "page_seo"
    __table_args__ = (UniqueConstraint("tenant_id", "page_key", name="uq_page_seo_tenant_page_key"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    page_key: Mapped[str] = mapped_column(String(64))
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    keywords: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
