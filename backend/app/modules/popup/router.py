from app.core.crud import TenantCrudRouter
from app.modules.popup.models import Popup
from app.modules.popup.schemas import PopupCreate, PopupOut, PopupUpdate

router = TenantCrudRouter(
    model=Popup,
    create_schema=PopupCreate,
    update_schema=PopupUpdate,
    out_schema=PopupOut,
    prefix="/popups",
    tag="popup",
).router
