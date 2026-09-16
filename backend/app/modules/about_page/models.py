import enum
from typing import Optional

from sqlalchemy import Enum, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class AboutSection(str, enum.Enum):
    overview = "overview"
    strategic_objectives = "strategic_objectives"
    corporate_governance = "corporate_governance"


class AboutPage(Base):
    """About Us subpages (Overview / Strategic Objectives / Corporate
    Governance) — one row per tenant per section. Overview uses all three
    text fields; the other two sections only use `description`."""

    __tablename__ = "about_pages"
    __table_args__ = (UniqueConstraint("tenant_id", "section", name="uq_about_pages_tenant_section"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    section: Mapped[AboutSection] = mapped_column(Enum(AboutSection, native_enum=False, length=32))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    highlighted_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bullet_point_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    file: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
