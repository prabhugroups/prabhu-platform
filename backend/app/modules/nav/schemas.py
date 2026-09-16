from typing import Optional

from pydantic import BaseModel

from app.modules.nav.models import NavLocation


class NavItemCreate(BaseModel):
    parent_id: Optional[int] = None
    location: NavLocation
    label: str
    url: str
    sort_order: int = 0
    is_external: bool = False


class NavItemUpdate(BaseModel):
    parent_id: Optional[int] = None
    location: Optional[NavLocation] = None
    label: Optional[str] = None
    url: Optional[str] = None
    sort_order: Optional[int] = None
    is_external: Optional[bool] = None


class NavItemOut(BaseModel):
    id: int
    parent_id: Optional[int]
    location: NavLocation
    label: str
    url: str
    sort_order: int
    is_external: bool

    model_config = {"from_attributes": True}
