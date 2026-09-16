from typing import Optional

from pydantic import BaseModel


class TenantContactUpsert(BaseModel):
    phone_primary: Optional[str] = None
    phone_secondary: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None
    opening_hours: Optional[str] = None
    whatsapp_number: Optional[str] = None
    registered_office: Optional[str] = None
    branch_office: Optional[str] = None
    copyright_text: Optional[str] = None
    map_file: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    youtube_url: Optional[str] = None


class TenantContactOut(BaseModel):
    phone_primary: Optional[str]
    phone_secondary: Optional[str]
    email: Optional[str]
    location: Optional[str]
    opening_hours: Optional[str]
    whatsapp_number: Optional[str]
    registered_office: Optional[str]
    branch_office: Optional[str]
    copyright_text: Optional[str]
    map_file: Optional[str]
    facebook_url: Optional[str]
    instagram_url: Optional[str]
    youtube_url: Optional[str]

    model_config = {"from_attributes": True}
