from typing import Optional

from pydantic import BaseModel


class TenantDomainOut(BaseModel):
    id: int
    hostname: str
    is_primary: bool

    model_config = {"from_attributes": True}


class TenantDomainCreate(BaseModel):
    hostname: str
    is_primary: bool = False


class TenantPublicOut(BaseModel):
    """What the Next.js public site / theme provider actually needs."""

    slug: str
    name: str
    shareholder_module_enabled: bool
    primary_color: str
    secondary_color: str
    primary_light_color: str
    font_family: str
    logo_file: Optional[str]
    favicon_file: Optional[str]
    default_og_image_file: Optional[str]
    footer_text: Optional[str]

    model_config = {"from_attributes": True}


class TenantOut(TenantPublicOut):
    id: int
    is_active: bool
    domains: list[TenantDomainOut] = []


class TenantCreate(BaseModel):
    slug: str
    name: str
    shareholder_module_enabled: bool = False
    primary_color: str = "#0059ab"
    secondary_color: str = "#17ad4c"
    primary_light_color: str = "#4a90e2"
    font_family: str = "Sansation"
    footer_text: Optional[str] = None
    domains: list[TenantDomainCreate] = []


class TenantSelfUpdate(BaseModel):
    """What a tenant_admin may edit about their own tenant — branding only,
    never `is_active`/`shareholder_module_enabled` (super_admin-only)."""

    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    primary_light_color: Optional[str] = None
    font_family: Optional[str] = None
    footer_text: Optional[str] = None
    logo_file: Optional[str] = None
    favicon_file: Optional[str] = None
    default_og_image_file: Optional[str] = None


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    shareholder_module_enabled: Optional[bool] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    primary_light_color: Optional[str] = None
    font_family: Optional[str] = None
    footer_text: Optional[str] = None
    logo_file: Optional[str] = None
    favicon_file: Optional[str] = None
    default_og_image_file: Optional[str] = None
