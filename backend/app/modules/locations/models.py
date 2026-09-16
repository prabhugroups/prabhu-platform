from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Province(Base):
    """Global Nepal reference data — not tenant-scoped. Seeded once from the
    JSON files duplicated across 4 legacy repos (locations/provinces.json)."""

    __tablename__ = "locations_provinces"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True)


class District(Base):
    __tablename__ = "locations_districts"

    id: Mapped[int] = mapped_column(primary_key=True)
    province_id: Mapped[int] = mapped_column(ForeignKey("locations_provinces.id"), index=True)
    name: Mapped[str] = mapped_column(String(128))


class Municipality(Base):
    __tablename__ = "locations_municipalities"

    id: Mapped[int] = mapped_column(primary_key=True)
    district_id: Mapped[int] = mapped_column(ForeignKey("locations_districts.id"), index=True)
    name: Mapped[str] = mapped_column(String(128))
