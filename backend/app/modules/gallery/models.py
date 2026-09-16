import datetime
from typing import Optional

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Gallery(Base):
    __tablename__ = "galleries"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)

    images: Mapped[list["GalleryImage"]] = relationship(
        back_populates="gallery", cascade="all, delete-orphan"
    )


class GalleryImage(Base):
    __tablename__ = "gallery_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    gallery_id: Mapped[int] = mapped_column(ForeignKey("galleries.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(32), default="Gallery")  # "Gallery" | "Video"
    file: Mapped[str] = mapped_column(String(512))

    gallery: Mapped["Gallery"] = relationship(back_populates="images")
