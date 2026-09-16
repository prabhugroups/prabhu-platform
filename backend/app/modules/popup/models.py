from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Popup(Base):
    """Single active site-wide modal banner per tenant."""

    __tablename__ = "popups"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    image: Mapped[str] = mapped_column(String(512))
    status: Mapped[bool] = mapped_column(Boolean, default=False)
