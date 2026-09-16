import datetime
from typing import Optional

from pydantic import BaseModel


class GalleryImageOut(BaseModel):
    id: int
    type: str
    file: str

    model_config = {"from_attributes": True}


class GalleryImageCreate(BaseModel):
    type: str = "Gallery"
    file: str


class GalleryCreate(BaseModel):
    title: str
    date: Optional[datetime.date] = None


class GalleryUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[datetime.date] = None


class GalleryOut(BaseModel):
    id: int
    title: str
    date: Optional[datetime.date]
    images: list[GalleryImageOut] = []

    model_config = {"from_attributes": True}
