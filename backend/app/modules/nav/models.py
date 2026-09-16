import enum
from typing import Optional

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class NavLocation(str, enum.Enum):
    header = "header"
    footer = "footer"


class NavItem(Base):
    """Replaces the drifted, hardcoded Navbar.tsx/Footer.tsx arrays found in
    every legacy frontend. parent_id supports one level of dropdown children.
    """

    __tablename__ = "nav_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    parent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("nav_items.id", ondelete="CASCADE"), nullable=True
    )
    location: Mapped[NavLocation] = mapped_column(Enum(NavLocation))
    label: Mapped[str] = mapped_column(String(128))
    url: Mapped[str] = mapped_column(String(512))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_external: Mapped[bool] = mapped_column(Boolean, default=False)
