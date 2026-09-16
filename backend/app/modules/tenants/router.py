from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.deps import require_super_admin, resolve_public_tenant
from app.db.session import get_db
from app.modules.tenants.models import Tenant, TenantDomain
from app.modules.tenants.schemas import (
    TenantCreate,
    TenantDomainCreate,
    TenantDomainOut,
    TenantOut,
    TenantPublicOut,
    TenantUpdate,
)

router = APIRouter(tags=["tenants"])


def _normalize_host(hostname: str) -> str:
    host = hostname.lower().strip()
    if host.startswith("www."):
        host = host[4:]
    return host.split(":")[0]


@router.get("/internal/tenants/by-domain/{hostname}", response_model=TenantPublicOut)
def resolve_tenant_by_domain(hostname: str, db: Session = Depends(get_db)) -> Tenant:
    """Called by the Next.js middleware only (reachable exclusively over the
    docker-internal network — FastAPI is never routed by Traefik). Matches
    the incoming Host header, apex or www, to exactly one tenant."""
    host = _normalize_host(hostname)
    domain = (
        db.query(TenantDomain)
        .join(Tenant)
        .filter(TenantDomain.hostname == host, Tenant.is_active.is_(True))
        .first()
    )
    if domain is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No tenant maps to this hostname")
    return domain.tenant


@router.get("/public/theme", response_model=TenantPublicOut)
def public_theme(tenant: Tenant = Depends(resolve_public_tenant)) -> Tenant:
    return tenant


# ---- Super admin: cross-tenant management ----

super_router = APIRouter(
    prefix="/super/tenants", tags=["super-admin"], dependencies=[Depends(require_super_admin)]
)


@super_router.get("", response_model=list[TenantOut])
def list_tenants(db: Session = Depends(get_db)) -> list[Tenant]:
    return db.query(Tenant).options(joinedload(Tenant.domains)).order_by(Tenant.name).all()


@super_router.post("", response_model=TenantOut, status_code=status.HTTP_201_CREATED)
def create_tenant(payload: TenantCreate, db: Session = Depends(get_db)) -> Tenant:
    if db.query(Tenant).filter(Tenant.slug == payload.slug).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Slug already in use")
    tenant = Tenant(**payload.model_dump(exclude={"domains"}))
    for d in payload.domains:
        tenant.domains.append(TenantDomain(hostname=_normalize_host(d.hostname), is_primary=d.is_primary))
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


@super_router.get("/{tenant_id}", response_model=TenantOut)
def get_tenant(tenant_id: int, db: Session = Depends(get_db)) -> Tenant:
    tenant = db.get(Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tenant not found")
    return tenant


@super_router.patch("/{tenant_id}", response_model=TenantOut)
def update_tenant(tenant_id: int, payload: TenantUpdate, db: Session = Depends(get_db)) -> Tenant:
    tenant = db.get(Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tenant not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(tenant, field, value)
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


@super_router.post("/{tenant_id}/domains", response_model=TenantDomainOut)
def add_tenant_domain(
    tenant_id: int, payload: TenantDomainCreate, db: Session = Depends(get_db)
) -> TenantDomain:
    tenant = db.get(Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tenant not found")
    hostname = _normalize_host(payload.hostname)
    if db.query(TenantDomain).filter(TenantDomain.hostname == hostname).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Hostname already mapped to a tenant")
    domain = TenantDomain(tenant_id=tenant_id, hostname=hostname, is_primary=payload.is_primary)
    db.add(domain)
    db.commit()
    db.refresh(domain)
    return domain


@super_router.delete("/{tenant_id}/domains/{domain_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_tenant_domain(tenant_id: int, domain_id: int, db: Session = Depends(get_db)) -> None:
    domain = (
        db.query(TenantDomain)
        .filter(TenantDomain.id == domain_id, TenantDomain.tenant_id == tenant_id)
        .first()
    )
    if domain is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Domain not found")
    db.delete(domain)
    db.commit()
