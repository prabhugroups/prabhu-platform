from app.core.crud import TenantCrudRouter
from app.modules.faqs.models import Faq
from app.modules.faqs.schemas import FaqCreate, FaqOut, FaqUpdate

router = TenantCrudRouter(
    model=Faq,
    create_schema=FaqCreate,
    update_schema=FaqUpdate,
    out_schema=FaqOut,
    prefix="/faqs",
    tag="faqs",
    order_by=Faq.sort_order,
).router
