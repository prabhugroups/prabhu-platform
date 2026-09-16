from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Portfolio(Base):
    """Project/asset showcase — generic across every tenant regardless of
    industry (hydropower project, steel plant, cable-car line, land parcel)."""

    __tablename__ = "portfolios"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    file: Mapped[str] = mapped_column(String(512))
    type: Mapped[str] = mapped_column(String(64))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
