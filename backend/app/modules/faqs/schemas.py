from typing import Optional

from pydantic import BaseModel


class FaqCreate(BaseModel):
    category: Optional[str] = None
    question: str
    answer: str
    sort_order: int = 0


class FaqUpdate(BaseModel):
    category: Optional[str] = None
    question: Optional[str] = None
    answer: Optional[str] = None
    sort_order: Optional[int] = None


class FaqOut(BaseModel):
    id: int
    category: Optional[str]
    question: str
    answer: str
    sort_order: int

    model_config = {"from_attributes": True}
