from typing import Optional

from pydantic import BaseModel


class BannerCreate(BaseModel):
    title: str
    link: Optional[str] = None
    file: str
    sort_order: int = 0


class BannerUpdate(BaseModel):
    title: Optional[str] = None
    link: Optional[str] = None
    file: Optional[str] = None
    sort_order: Optional[int] = None


class BannerOut(BaseModel):
    id: int
    title: str
    link: Optional[str]
    file: str
    sort_order: int

    model_config = {"from_attributes": True}
