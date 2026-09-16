import datetime
from typing import Optional

from pydantic import BaseModel

from app.modules.applications.models import ApplicationStatus


class ApplicationCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    citizenship_file: Optional[str] = None
    bank_deposit_file: Optional[str] = None
    request_form_file: Optional[str] = None
    share_type: Optional[str] = None
    pan: Optional[str] = None
    nid: Optional[str] = None
    extra: Optional[dict] = None


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus


class ApplicationOut(BaseModel):
    id: int
    name: str
    phone: Optional[str]
    email: Optional[str]
    citizenship_file: Optional[str]
    bank_deposit_file: Optional[str]
    request_form_file: Optional[str]
    share_type: Optional[str]
    pan: Optional[str]
    nid: Optional[str]
    status: ApplicationStatus
    extra: Optional[dict]
    created_at: datetime.datetime

    model_config = {"from_attributes": True}
