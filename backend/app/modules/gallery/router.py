from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_tenant_scope, resolve_public_tenant
from app.db.session import get_db
from app.modules.gallery.models import Gallery, GalleryImage
from app.modules.gallery.schemas import (
    GalleryCreate,
    GalleryImageCreate,
    GalleryImageOut,
    GalleryOut,
    GalleryUpdate,
)
from app.modules.tenants.models import Tenant

router = APIRouter(tags=["gallery"])


def _get_or_404(db: Session, gallery_id: int, tenant_id: int) -> Gallery:
    gallery = (
        db.query(Gallery)
        .options(joinedload(Gallery.images))
        .filter(Gallery.id == gallery_id, Gallery.tenant_id == tenant_id)
        .first()
    )
    if gallery is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Gallery not found")
    return gallery


@router.get("/galleries", response_model=list[GalleryOut])
def public_list(tenant: Tenant = Depends(resolve_public_tenant), db: Session = Depends(get_db)):
    return (
        db.query(Gallery)
        .options(joinedload(Gallery.images))
        .filter(Gallery.tenant_id == tenant.id)
        .order_by(Gallery.date.desc())
        .all()
    )


@router.get("/admin/galleries", response_model=list[GalleryOut])
def admin_list(tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)):
    return (
        db.query(Gallery)
        .options(joinedload(Gallery.images))
        .filter(Gallery.tenant_id == tenant_id)
        .order_by(Gallery.date.desc())
        .all()
    )


@router.post("/admin/galleries", response_model=GalleryOut, status_code=status.HTTP_201_CREATED)
def admin_create(
    payload: GalleryCreate, tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)
):
    gallery = Gallery(tenant_id=tenant_id, **payload.model_dump())
    db.add(gallery)
    db.commit()
    db.refresh(gallery)
    return gallery


@router.patch("/admin/galleries/{gallery_id}", response_model=GalleryOut)
def admin_update(
    gallery_id: int,
    payload: GalleryUpdate,
    tenant_id: int = Depends(get_tenant_scope),
    db: Session = Depends(get_db),
):
    gallery = _get_or_404(db, gallery_id, tenant_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(gallery, field, value)
    db.add(gallery)
    db.commit()
    db.refresh(gallery)
    return gallery


@router.delete("/admin/galleries/{gallery_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete(
    gallery_id: int, tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)
):
    gallery = _get_or_404(db, gallery_id, tenant_id)
    db.delete(gallery)
    db.commit()


@router.post(
    "/admin/galleries/{gallery_id}/images",
    response_model=GalleryImageOut,
    status_code=status.HTTP_201_CREATED,
)
def admin_add_image(
    gallery_id: int,
    payload: GalleryImageCreate,
    tenant_id: int = Depends(get_tenant_scope),
    db: Session = Depends(get_db),
):
    _get_or_404(db, gallery_id, tenant_id)  # ensures the gallery belongs to this tenant
    image = GalleryImage(gallery_id=gallery_id, **payload.model_dump())
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


@router.delete(
    "/admin/galleries/{gallery_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT
)
def admin_delete_image(
    gallery_id: int,
    image_id: int,
    tenant_id: int = Depends(get_tenant_scope),
    db: Session = Depends(get_db),
):
    _get_or_404(db, gallery_id, tenant_id)
    image = (
        db.query(GalleryImage)
        .filter(GalleryImage.id == image_id, GalleryImage.gallery_id == gallery_id)
        .first()
    )
    if image is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found")
    db.delete(image)
    db.commit()
