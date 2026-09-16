from typing import Optional

from pydantic import BaseModel


class TeamMemberCreate(BaseModel):
    type: str
    image: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    company_name: Optional[str] = None
    additional_info: Optional[dict] = None
    sort_order: int = 0


class TeamMemberUpdate(BaseModel):
    type: Optional[str] = None
    image: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    company_name: Optional[str] = None
    additional_info: Optional[dict] = None
    sort_order: Optional[int] = None


class TeamMemberOut(BaseModel):
    id: int
    type: str
    image: Optional[str]
    name: Optional[str]
    role: Optional[str]
    company_name: Optional[str]
    additional_info: Optional[dict]
    sort_order: int

    model_config = {"from_attributes": True}
