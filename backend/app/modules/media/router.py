from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.orm import Session

from app.core.deps import get_tenant_scope
from app.db.session import get_db
from app.modules.media.service import save_upload
from app.modules.tenants.models import Tenant

router = APIRouter(prefix="/admin/media", tags=["media"])


@router.post("/upload")
async def upload(
    module: str,
    file: UploadFile,
    tenant_id: int = Depends(get_tenant_scope),
    db: Session = Depends(get_db),
) -> dict:
    tenant = db.get(Tenant, tenant_id)
    relative_path = await save_upload(tenant_slug=tenant.slug, module=module, file=file)
    return {"path": relative_path, "url": f"/media/{relative_path}"}
