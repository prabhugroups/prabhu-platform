from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_tenant_scope, resolve_public_tenant
from app.db.session import get_db
from app.modules.applications.models import Application
from app.modules.applications.schemas import ApplicationCreate, ApplicationOut, ApplicationStatusUpdate
from app.modules.tenants.models import Tenant

router = APIRouter(tags=["applications"])


@router.post("/applications", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def submit_application(
    payload: ApplicationCreate,
    tenant: Tenant = Depends(resolve_public_tenant),
    db: Session = Depends(get_db),
) -> Application:
    """Public share/membership request intake — present in all 7 tenants
    regardless of whether the full shareholder-KYC registry is enabled for
    them; this is the lightweight form, not the registrar back office."""
    application = Application(tenant_id=tenant.id, **payload.model_dump())
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


@router.get("/admin/applications", response_model=list[ApplicationOut])
def admin_list(tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)):
    return (
        db.query(Application)
        .filter(Application.tenant_id == tenant_id)
        .order_by(Application.created_at.desc())
        .all()
    )


@router.get("/admin/applications/{application_id}", response_model=ApplicationOut)
def admin_get(
    application_id: int, tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)
):
    application = _get_or_404(db, application_id, tenant_id)
    return application


@router.patch("/admin/applications/{application_id}", response_model=ApplicationOut)
def admin_update_status(
    application_id: int,
    payload: ApplicationStatusUpdate,
    tenant_id: int = Depends(get_tenant_scope),
    db: Session = Depends(get_db),
):
    application = _get_or_404(db, application_id, tenant_id)
    application.status = payload.status
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


@router.delete("/admin/applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete(
    application_id: int, tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)
):
    application = _get_or_404(db, application_id, tenant_id)
    db.delete(application)
    db.commit()


def _get_or_404(db: Session, application_id: int, tenant_id: int) -> Application:
    application = (
        db.query(Application)
        .filter(Application.id == application_id, Application.tenant_id == tenant_id)
        .first()
    )
    if application is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    return application
