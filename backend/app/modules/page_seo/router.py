from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_tenant_scope, resolve_public_tenant
from app.db.session import get_db
from app.modules.page_seo.models import PageSeo
from app.modules.page_seo.schemas import PageSeoOut, PageSeoUpsert
from app.modules.tenants.models import Tenant

router = APIRouter(tags=["page-seo"])


@router.get("/admin/page-seo", response_model=list[PageSeoOut])
def admin_list(tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)) -> list[PageSeo]:
    return db.query(PageSeo).filter(PageSeo.tenant_id == tenant_id).all()


@router.put("/admin/page-seo", response_model=PageSeoOut)
def admin_upsert(
    payload: PageSeoUpsert,
    tenant_id: int = Depends(get_tenant_scope),
    db: Session = Depends(get_db),
) -> PageSeo:
    row = (
        db.query(PageSeo)
        .filter(PageSeo.tenant_id == tenant_id, PageSeo.page_key == payload.page_key)
        .first()
    )
    if row is None:
        row = PageSeo(tenant_id=tenant_id, page_key=payload.page_key)
    for field, value in payload.model_dump(exclude={"page_key"}).items():
        setattr(row, field, value)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/page-seo/{page_key}", response_model=Optional[PageSeoOut])
def public_get(
    page_key: str,
    tenant: Tenant = Depends(resolve_public_tenant),
    db: Session = Depends(get_db),
) -> Optional[PageSeo]:
    return (
        db.query(PageSeo)
        .filter(PageSeo.tenant_id == tenant.id, PageSeo.page_key == page_key)
        .first()
    )
