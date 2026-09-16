from app.core.crud import TenantCrudRouter
from app.modules.nav.models import NavItem
from app.modules.nav.schemas import NavItemCreate, NavItemOut, NavItemUpdate

router = TenantCrudRouter(
    model=NavItem,
    create_schema=NavItemCreate,
    update_schema=NavItemUpdate,
    out_schema=NavItemOut,
    prefix="/nav-items",
    tag="nav",
    order_by=NavItem.sort_order,
).router
