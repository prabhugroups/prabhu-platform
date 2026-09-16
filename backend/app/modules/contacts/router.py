from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_tenant_scope, resolve_public_tenant
from app.db.session import get_db
from app.modules.contacts.models import Contact
from app.modules.contacts.schemas import ContactCreate, ContactOut
from app.modules.tenants.models import Tenant

router = APIRouter(tags=["contacts"])


@router.post("/contacts", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
def submit_contact(
    payload: ContactCreate,
    tenant: Tenant = Depends(resolve_public_tenant),
    db: Session = Depends(get_db),
) -> Contact:
    """Public, unauthenticated — matches the legacy contact-form behavior
    identical across all 7 tenants. Submissions are never publicly listable,
    only via the tenant-scoped admin endpoints below."""
    contact = Contact(tenant_id=tenant.id, **payload.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.get("/admin/contacts", response_model=list[ContactOut])
def admin_list(tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)):
    return (
        db.query(Contact)
        .filter(Contact.tenant_id == tenant_id)
        .order_by(Contact.created_at.desc())
        .all()
    )


@router.get("/admin/contacts/{contact_id}", response_model=ContactOut)
def admin_get(contact_id: int, tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)):
    contact = (
        db.query(Contact).filter(Contact.id == contact_id, Contact.tenant_id == tenant_id).first()
    )
    if contact is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contact not found")
    return contact


@router.delete("/admin/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete(
    contact_id: int, tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)
):
    contact = (
        db.query(Contact).filter(Contact.id == contact_id, Contact.tenant_id == tenant_id).first()
    )
    if contact is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contact not found")
    db.delete(contact)
    db.commit()
