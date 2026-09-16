from typing import Optional

from sqlalchemy import ForeignKey, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.mixins import TimestampMixin
from app.db.session import Base


class ContentSetting(Base, TimestampMixin):
    """Direct port of the legacy `general_settings` key-value+blob table —
    proven across all 7 tenants to cover arbitrary content (hero banners,
    about-us rich text, per-page SEO records, contact-info bundles, favicon)
    without a schema change per content type. `group` namespaces related keys
    (e.g. group="seo", key="homeSeo"); `infos` is a schemaless JSON escape
    hatch for anything with nested structure.
    """

    __tablename__ = "content_settings"
    __table_args__ = (UniqueConstraint("tenant_id", "key", name="uq_content_settings_tenant_key"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    group: Mapped[str] = mapped_column(String(64), index=True)
    key: Mapped[str] = mapped_column(String(128))
    type: Mapped[str] = mapped_column(String(32), default="text")
    value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    file: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    infos: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
