from app.core.crud import TenantCrudRouter
from app.modules.banner.models import Banner
from app.modules.banner.schemas import BannerCreate, BannerOut, BannerUpdate

router = TenantCrudRouter(
    model=Banner,
    create_schema=BannerCreate,
    update_schema=BannerUpdate,
    out_schema=BannerOut,
    prefix="/banners",
    tag="banner",
    order_by=Banner.sort_order,
).router
