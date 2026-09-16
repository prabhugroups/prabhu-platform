from typing import Optional

from pydantic import BaseModel

from app.modules.about_page.models import AboutSection


class AboutPageUpsert(BaseModel):
    section: AboutSection
    description: Optional[str] = None
    highlighted_content: Optional[str] = None
    bullet_point_content: Optional[str] = None
    file: Optional[str] = None


class AboutPageOut(BaseModel):
    section: AboutSection
    description: Optional[str]
    highlighted_content: Optional[str]
    bullet_point_content: Optional[str]
    file: Optional[str]

    model_config = {"from_attributes": True}
