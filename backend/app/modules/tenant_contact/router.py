from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_tenant_scope, resolve_public_tenant
from app.db.session import get_db
from app.modules.tenant_contact.models import TenantContact
from app.modules.tenant_contact.schemas import TenantContactOut, TenantContactUpsert
from app.modules.tenants.models import Tenant

router = APIRouter(tags=["tenant-contact"])


@router.get("/contact-info", response_model=Optional[TenantContactOut])
def public_get(
    tenant: Tenant = Depends(resolve_public_tenant), db: Session = Depends(get_db)
) -> Optional[TenantContact]:
    return db.query(TenantContact).filter(TenantContact.tenant_id == tenant.id).first()


@router.get("/admin/contact-info", response_model=Optional[TenantContactOut])
def admin_get(
    tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)
) -> Optional[TenantContact]:
    return db.query(TenantContact).filter(TenantContact.tenant_id == tenant_id).first()


@router.put("/admin/contact-info", response_model=TenantContactOut)
def admin_upsert(
    payload: TenantContactUpsert,
    tenant_id: int = Depends(get_tenant_scope),
    db: Session = Depends(get_db),
) -> TenantContact:
    row = db.query(TenantContact).filter(TenantContact.tenant_id == tenant_id).first()
    if row is None:
        row = TenantContact(tenant_id=tenant_id)
    for field, value in payload.model_dump().items():
        setattr(row, field, value)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
