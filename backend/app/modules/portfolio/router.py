from app.core.crud import TenantCrudRouter
from app.modules.portfolio.models import Portfolio
from app.modules.portfolio.schemas import PortfolioCreate, PortfolioOut, PortfolioUpdate

router = TenantCrudRouter(
    model=Portfolio,
    create_schema=PortfolioCreate,
    update_schema=PortfolioUpdate,
    out_schema=PortfolioOut,
    prefix="/portfolios",
    tag="portfolio",
    order_by=Portfolio.sort_order,
).router
