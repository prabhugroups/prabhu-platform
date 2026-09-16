from typing import Optional

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    tenant_id: Optional[int] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class AdminUserOut(BaseModel):
    id: int
    tenant_id: Optional[int]
    name: str
    email: EmailStr
    username: str
    role: str
    is_active: bool

    model_config = {"from_attributes": True}
