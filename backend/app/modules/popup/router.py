from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.crud import TenantCrudRouter
from app.core.deps import get_tenant_scope
from app.db.session import get_db
from app.modules.popup.models import Popup
from app.modules.popup.schemas import PopupCreate, PopupOut, PopupUpdate

_crud = TenantCrudRouter(
    model=Popup,
    create_schema=PopupCreate,
    update_schema=PopupUpdate,
    out_schema=PopupOut,
    prefix="/popups",
    tag="popup",
)
router = _crud.router


@router.patch("/admin/popups/{popup_id}/activate", response_model=PopupOut)
def activate_popup(
    popup_id: int, tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)
) -> Popup:
    """Only one popup can be active at a time (see prabhucablecar-web's
    admin/popup single-active-item constraint) — deactivate every other
    popup for this tenant in the same transaction as activating this one."""
    target = _crud._get_or_404(db, popup_id, tenant_id)
    db.query(Popup).filter(Popup.tenant_id == tenant_id, Popup.id != popup_id).update({"status": False})
    target.status = True
    db.add(target)
    db.commit()
    db.refresh(target)
    return target
