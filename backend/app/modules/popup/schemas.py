from typing import Optional

from pydantic import BaseModel


class PopupCreate(BaseModel):
    image: str
    status: bool = False


class PopupUpdate(BaseModel):
    image: Optional[str] = None
    status: Optional[bool] = None


class PopupOut(BaseModel):
    id: int
    image: str
    status: bool

    model_config = {"from_attributes": True}
