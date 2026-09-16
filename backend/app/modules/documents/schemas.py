import datetime
from typing import Optional

from pydantic import BaseModel


class DocumentCreate(BaseModel):
    title: str
    file: str
    type: str
    date: Optional[datetime.date] = None


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    file: Optional[str] = None
    type: Optional[str] = None
    date: Optional[datetime.date] = None


class DocumentOut(BaseModel):
    id: int
    title: str
    file: str
    type: str
    date: Optional[datetime.date]

    model_config = {"from_attributes": True}
