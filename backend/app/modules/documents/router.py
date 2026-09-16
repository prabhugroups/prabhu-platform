from app.core.crud import TenantCrudRouter
from app.modules.documents.models import Document
from app.modules.documents.schemas import DocumentCreate, DocumentOut, DocumentUpdate

router = TenantCrudRouter(
    model=Document,
    create_schema=DocumentCreate,
    update_schema=DocumentUpdate,
    out_schema=DocumentOut,
    prefix="/documents",
    tag="documents",
    order_by=Document.date.desc(),
).router
