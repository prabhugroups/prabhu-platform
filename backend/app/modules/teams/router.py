from app.core.crud import TenantCrudRouter
from app.modules.teams.models import TeamMember
from app.modules.teams.schemas import TeamMemberCreate, TeamMemberOut, TeamMemberUpdate

router = TenantCrudRouter(
    model=TeamMember,
    create_schema=TeamMemberCreate,
    update_schema=TeamMemberUpdate,
    out_schema=TeamMemberOut,
    prefix="/teams",
    tag="teams",
    order_by=TeamMember.sort_order,
).router
