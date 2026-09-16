from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_tenant_scope, resolve_public_tenant
from app.db.session import get_db
from app.modules.settings.models import ContentSetting
from app.modules.settings.schemas import ContentSettingOut, ContentSettingUpsert
from app.modules.tenants.models import Tenant

router = APIRouter(tags=["settings"])


@router.get("/public/settings", response_model=list[ContentSettingOut])
def public_list(
    group: Optional[str] = None,
    tenant: Tenant = Depends(resolve_public_tenant),
    db: Session = Depends(get_db),
):
    """Covers everything the legacy `general_settings` table drove: hero
    banners, about-us rich text, per-page SEO records (group="seo"), contact
    info bundle. Filter by `group` (e.g. ?group=seo) or fetch all."""
    q = db.query(ContentSetting).filter(ContentSetting.tenant_id == tenant.id)
    if group:
        q = q.filter(ContentSetting.group == group)
    return q.all()


@router.get("/public/settings/{key}", response_model=ContentSettingOut)
def public_get(key: str, tenant: Tenant = Depends(resolve_public_tenant), db: Session = Depends(get_db)):
    setting = (
        db.query(ContentSetting)
        .filter(ContentSetting.tenant_id == tenant.id, ContentSetting.key == key)
        .first()
    )
    if setting is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Setting not found")
    return setting


@router.get("/admin/settings", response_model=list[ContentSettingOut])
def admin_list(
    group: Optional[str] = None,
    tenant_id: int = Depends(get_tenant_scope),
    db: Session = Depends(get_db),
):
    q = db.query(ContentSetting).filter(ContentSetting.tenant_id == tenant_id)
    if group:
        q = q.filter(ContentSetting.group == group)
    return q.all()


@router.put("/admin/settings", response_model=ContentSettingOut)
def admin_upsert(
    payload: ContentSettingUpsert,
    tenant_id: int = Depends(get_tenant_scope),
    db: Session = Depends(get_db),
):
    """Upsert-by-key: the CMS always edits "the SEO record for this page" or
    "the theme banner", never juggles surrogate IDs for this table."""
    setting = (
        db.query(ContentSetting)
        .filter(ContentSetting.tenant_id == tenant_id, ContentSetting.key == payload.key)
        .first()
    )
    if setting is None:
        setting = ContentSetting(tenant_id=tenant_id, key=payload.key)
    for field, value in payload.model_dump(exclude={"key"}).items():
        setattr(setting, field, value)
    db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting


@router.delete("/admin/settings/{key}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete(key: str, tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)):
    setting = (
        db.query(ContentSetting)
        .filter(ContentSetting.tenant_id == tenant_id, ContentSetting.key == key)
        .first()
    )
    if setting is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Setting not found")
    db.delete(setting)
    db.commit()
