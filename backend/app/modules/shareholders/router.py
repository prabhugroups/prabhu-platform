from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_admin, get_tenant_scope
from app.db.session import get_db
from app.modules.auth.models import AdminUser
from app.modules.shareholders.models import (
    Shareholder,
    ShareholderAddress,
    ShareholderBankInfo,
    ShareholderCitizenshipInfo,
    ShareholderNationalIdInfo,
    ShareholderNominee,
)
from app.modules.shareholders.schemas import ShareholderCreate, ShareholderOut, ShareholderUpdate
from app.modules.tenants.models import Tenant

router = APIRouter(prefix="/admin/shareholders", tags=["shareholders"])

_LOAD_OPTS = (
    joinedload(Shareholder.citizenship_info),
    joinedload(Shareholder.national_id_info),
    joinedload(Shareholder.bank_info),
    joinedload(Shareholder.addresses),
    joinedload(Shareholder.nominees),
)


def _require_module_enabled(db: Session, tenant_id: int) -> None:
    tenant = db.get(Tenant, tenant_id)
    if tenant is None or not tenant.shareholder_module_enabled:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "The shareholder registry module is not enabled for this tenant",
        )


def _get_or_404(db: Session, shareholder_id: int, tenant_id: int) -> Shareholder:
    row = (
        db.query(Shareholder)
        .options(*_LOAD_OPTS)
        .filter(Shareholder.id == shareholder_id, Shareholder.tenant_id == tenant_id)
        .first()
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shareholder not found")
    return row


def _apply_nested(db: Session, row: Shareholder, payload: ShareholderCreate | ShareholderUpdate) -> None:
    if payload.citizenship_info is not None:
        row.citizenship_info = ShareholderCitizenshipInfo(**payload.citizenship_info.model_dump())
    if payload.national_id_info is not None:
        row.national_id_info = ShareholderNationalIdInfo(**payload.national_id_info.model_dump())
    if payload.bank_info is not None:
        row.bank_info = ShareholderBankInfo(**payload.bank_info.model_dump())
    if payload.addresses:
        row.addresses = [ShareholderAddress(**a.model_dump()) for a in payload.addresses]
    if payload.nominees:
        row.nominees = [ShareholderNominee(**n.model_dump()) for n in payload.nominees]


@router.get("", response_model=list[ShareholderOut])
def list_shareholders(tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)):
    _require_module_enabled(db, tenant_id)
    return (
        db.query(Shareholder)
        .options(*_LOAD_OPTS)
        .filter(Shareholder.tenant_id == tenant_id)
        .order_by(Shareholder.name_en)
        .all()
    )


@router.post("", response_model=ShareholderOut, status_code=status.HTTP_201_CREATED)
def create_shareholder(
    payload: ShareholderCreate,
    tenant_id: int = Depends(get_tenant_scope),
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _require_module_enabled(db, tenant_id)
    core_fields = payload.model_dump(
        exclude={"citizenship_info", "national_id_info", "bank_info", "addresses", "nominees"}
    )
    row = Shareholder(tenant_id=tenant_id, created_by=admin.id, **core_fields)
    _apply_nested(db, row, payload)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _get_or_404(db, row.id, tenant_id)


@router.get("/{shareholder_id}", response_model=ShareholderOut)
def get_shareholder(
    shareholder_id: int, tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)
):
    _require_module_enabled(db, tenant_id)
    return _get_or_404(db, shareholder_id, tenant_id)


@router.patch("/{shareholder_id}", response_model=ShareholderOut)
def update_shareholder(
    shareholder_id: int,
    payload: ShareholderUpdate,
    tenant_id: int = Depends(get_tenant_scope),
    db: Session = Depends(get_db),
):
    _require_module_enabled(db, tenant_id)
    row = _get_or_404(db, shareholder_id, tenant_id)
    core_fields = payload.model_dump(
        exclude={"citizenship_info", "national_id_info", "bank_info", "addresses", "nominees"},
        exclude_unset=True,
    )
    for field, value in core_fields.items():
        setattr(row, field, value)
    _apply_nested(db, row, payload)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _get_or_404(db, row.id, tenant_id)


@router.delete("/{shareholder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shareholder(
    shareholder_id: int, tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)
):
    _require_module_enabled(db, tenant_id)
    row = _get_or_404(db, shareholder_id, tenant_id)
    db.delete(row)
    db.commit()
