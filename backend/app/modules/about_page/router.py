from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_tenant_scope, resolve_public_tenant
from app.db.session import get_db
from app.modules.about_page.models import AboutPage, AboutSection
from app.modules.about_page.schemas import AboutPageOut, AboutPageUpsert
from app.modules.tenants.models import Tenant

router = APIRouter(tags=["about-page"])


@router.get("/admin/about-pages", response_model=list[AboutPageOut])
def admin_list(tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)) -> list[AboutPage]:
    return db.query(AboutPage).filter(AboutPage.tenant_id == tenant_id).all()


@router.put("/admin/about-pages", response_model=AboutPageOut)
def admin_upsert(
    payload: AboutPageUpsert,
    tenant_id: int = Depends(get_tenant_scope),
    db: Session = Depends(get_db),
) -> AboutPage:
    """Upsert-by-section: the CMS always edits "the Overview page" or "the
    Strategic Objectives page", never juggles surrogate IDs for this table
    (same pattern as settings.admin_upsert's upsert-by-key)."""
    row = (
        db.query(AboutPage)
        .filter(AboutPage.tenant_id == tenant_id, AboutPage.section == payload.section)
        .first()
    )
    if row is None:
        row = AboutPage(tenant_id=tenant_id, section=payload.section)
    for field, value in payload.model_dump(exclude={"section"}).items():
        setattr(row, field, value)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/about-pages/{section}", response_model=Optional[AboutPageOut])
def public_get(
    section: AboutSection,
    tenant: Tenant = Depends(resolve_public_tenant),
    db: Session = Depends(get_db),
) -> Optional[AboutPage]:
    return (
        db.query(AboutPage)
        .filter(AboutPage.tenant_id == tenant.id, AboutPage.section == section)
        .first()
    )
