from typing import Optional

from pydantic import BaseModel


class PortfolioCreate(BaseModel):
    title: str
    file: str
    type: str
    sort_order: int = 0


class PortfolioUpdate(BaseModel):
    title: Optional[str] = None
    file: Optional[str] = None
    type: Optional[str] = None
    sort_order: Optional[int] = None


class PortfolioOut(BaseModel):
    id: int
    title: str
    file: str
    type: str
    sort_order: int

    model_config = {"from_attributes": True}
