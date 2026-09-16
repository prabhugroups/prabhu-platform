from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.crud import TenantCrudRouter
from app.core.deps import get_tenant_scope, resolve_public_tenant
from app.db.session import get_db
from app.modules.home_content.models import Associate, HomeContent, Spokesperson, Stakeholder
from app.modules.home_content.schemas import (
    AssociateCreate,
    AssociateOut,
    AssociateUpdate,
    HomeContentBundle,
    HomeContentOut,
    HomeContentUpsert,
    SpokespersonOut,
    SpokespersonUpsert,
    StakeholderCreate,
    StakeholderOut,
    StakeholderUpdate,
)
from app.modules.tenants.models import Tenant

router = APIRouter(tags=["home-content"])

# Stakeholders/associates are plain sortable lists — admin CRUD only here,
# public reads go through the combined /home-content bundle below instead of
# a second public list endpoint per resource.
router.include_router(
    TenantCrudRouter(
        model=Stakeholder,
        create_schema=StakeholderCreate,
        update_schema=StakeholderUpdate,
        out_schema=StakeholderOut,
        prefix="/home-content/stakeholders",
        tag="home-content",
        order_by=Stakeholder.sort_order,
        public_read=False,
    ).router
)

router.include_router(
    TenantCrudRouter(
        model=Associate,
        create_schema=AssociateCreate,
        update_schema=AssociateUpdate,
        out_schema=AssociateOut,
        prefix="/home-content/associates",
        tag="home-content",
        order_by=Associate.sort_order,
        public_read=False,
    ).router
)


@router.get("/admin/home-content/about", response_model=Optional[HomeContentOut])
def admin_get_about(
    tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)
) -> Optional[HomeContent]:
    return db.query(HomeContent).filter(HomeContent.tenant_id == tenant_id).first()


@router.put("/admin/home-content/about", response_model=HomeContentOut)
def admin_upsert_about(
    payload: HomeContentUpsert,
    tenant_id: int = Depends(get_tenant_scope),
    db: Session = Depends(get_db),
) -> HomeContent:
    row = db.query(HomeContent).filter(HomeContent.tenant_id == tenant_id).first()
    if row is None:
        row = HomeContent(tenant_id=tenant_id)
    for field, value in payload.model_dump().items():
        setattr(row, field, value)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/admin/home-content/spokesperson", response_model=Optional[SpokespersonOut])
def admin_get_spokesperson(
    tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)
) -> Optional[Spokesperson]:
    return db.query(Spokesperson).filter(Spokesperson.tenant_id == tenant_id).first()


@router.put("/admin/home-content/spokesperson", response_model=SpokespersonOut)
def admin_upsert_spokesperson(
    payload: SpokespersonUpsert,
    tenant_id: int = Depends(get_tenant_scope),
    db: Session = Depends(get_db),
) -> Spokesperson:
    row = db.query(Spokesperson).filter(Spokesperson.tenant_id == tenant_id).first()
    if row is None:
        row = Spokesperson(tenant_id=tenant_id)
    for field, value in payload.model_dump().items():
        setattr(row, field, value)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/home-content", response_model=HomeContentBundle)
def public_home_content(
    tenant: Tenant = Depends(resolve_public_tenant), db: Session = Depends(get_db)
) -> HomeContentBundle:
    about = db.query(HomeContent).filter(HomeContent.tenant_id == tenant.id).first()
    spokesperson = db.query(Spokesperson).filter(Spokesperson.tenant_id == tenant.id).first()
    stakeholders = (
        db.query(Stakeholder)
        .filter(Stakeholder.tenant_id == tenant.id)
        .order_by(Stakeholder.sort_order)
        .all()
    )
    associates = (
        db.query(Associate)
        .filter(Associate.tenant_id == tenant.id)
        .order_by(Associate.sort_order)
        .all()
    )
    return HomeContentBundle(
        about=about,
        stakeholders=stakeholders,
        associates=associates,
        spokesperson=spokesperson,
    )
