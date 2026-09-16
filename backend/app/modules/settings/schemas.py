from typing import Optional

from pydantic import BaseModel


class ContentSettingUpsert(BaseModel):
    group: str
    key: str
    type: str = "text"
    value: Optional[str] = None
    title: Optional[str] = None
    file: Optional[str] = None
    infos: Optional[dict] = None


class ContentSettingOut(BaseModel):
    id: int
    group: str
    key: str
    type: str
    value: Optional[str]
    title: Optional[str]
    file: Optional[str]
    infos: Optional[dict]

    model_config = {"from_attributes": True}
