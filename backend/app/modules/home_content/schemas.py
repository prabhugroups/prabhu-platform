from typing import Optional

from pydantic import BaseModel


class HomeContentUpsert(BaseModel):
    about_content: Optional[str] = None
    highlighted_content: Optional[str] = None


class HomeContentOut(BaseModel):
    about_content: Optional[str]
    highlighted_content: Optional[str]

    model_config = {"from_attributes": True}


class StakeholderCreate(BaseModel):
    logo_file: str
    link: Optional[str] = None
    sort_order: int = 0


class StakeholderUpdate(BaseModel):
    logo_file: Optional[str] = None
    link: Optional[str] = None
    sort_order: Optional[int] = None


class StakeholderOut(BaseModel):
    id: int
    logo_file: str
    link: Optional[str]
    sort_order: int

    model_config = {"from_attributes": True}


class AssociateCreate(BaseModel):
    logo_file: str
    link: Optional[str] = None
    sort_order: int = 0


class AssociateUpdate(BaseModel):
    logo_file: Optional[str] = None
    link: Optional[str] = None
    sort_order: Optional[int] = None


class AssociateOut(BaseModel):
    id: int
    logo_file: str
    link: Optional[str]
    sort_order: int

    model_config = {"from_attributes": True}


class SpokespersonUpsert(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    image: Optional[str] = None
    show: bool = False


class SpokespersonOut(BaseModel):
    name: Optional[str]
    role: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    image: Optional[str]
    show: bool

    model_config = {"from_attributes": True}


class HomeContentBundle(BaseModel):
    """Everything the homepage needs in one request."""

    about: Optional[HomeContentOut] = None
    stakeholders: list[StakeholderOut] = []
    associates: list[AssociateOut] = []
    spokesperson: Optional[SpokespersonOut] = None
