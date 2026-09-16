import datetime
from typing import Optional

from pydantic import BaseModel


class ContactCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    subject: Optional[str] = None
    message: Optional[str] = None
    file: Optional[str] = None


class ContactOut(BaseModel):
    id: int
    name: str
    phone: Optional[str]
    email: Optional[str]
    subject: Optional[str]
    message: Optional[str]
    file: Optional[str]
    created_at: datetime.datetime

    model_config = {"from_attributes": True}
