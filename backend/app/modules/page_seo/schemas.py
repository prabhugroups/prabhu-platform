from typing import Optional

from pydantic import BaseModel


class PageSeoUpsert(BaseModel):
    page_key: str
    title: Optional[str] = None
    description: Optional[str] = None
    keywords: Optional[str] = None


class PageSeoOut(BaseModel):
    page_key: str
    title: Optional[str]
    description: Optional[str]
    keywords: Optional[str]

    model_config = {"from_attributes": True}
