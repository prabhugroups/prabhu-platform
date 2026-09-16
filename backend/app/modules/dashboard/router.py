from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_tenant_scope
from app.db.session import get_db
from app.modules.applications.models import Application, ApplicationStatus
from app.modules.contacts.models import Contact
from app.modules.documents.models import Document
from app.modules.gallery.models import Gallery
from app.modules.portfolio.models import Portfolio
from app.modules.tenants.models import Tenant
from app.modules.teams.models import TeamMember

router = APIRouter(prefix="/admin/dashboard", tags=["dashboard"])


def _count(db: Session, model, tenant_id: int) -> int:
    return db.query(func.count(model.id)).filter(model.tenant_id == tenant_id).scalar() or 0


@router.get("/summary")
def summary(tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)) -> dict:
    tenant = db.get(Tenant, tenant_id)
    pending_applications = (
        db.query(func.count(Application.id))
        .filter(Application.tenant_id == tenant_id, Application.status == ApplicationStatus.pending)
        .scalar()
        or 0
    )
    return {
        "tenant": tenant.name,
        "contacts": _count(db, Contact, tenant_id),
        "applications": _count(db, Application, tenant_id),
        "pending_applications": pending_applications,
        "documents": _count(db, Document, tenant_id),
        "galleries": _count(db, Gallery, tenant_id),
        "portfolios": _count(db, Portfolio, tenant_id),
        "team_members": _count(db, TeamMember, tenant_id),
    }
