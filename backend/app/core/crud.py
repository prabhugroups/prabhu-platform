"""Generic tenant-scoped CRUD router factory.

The audit found 11 CMS tables (teams, documents, portfolios, popups,
contacts, ...) with byte-identical shape and behavior across all 7 legacy
tenants — plain list/create/get/update/delete, always scoped to one tenant.
Rather than hand-writing that router five times, modules whose only need is
this shape call build_tenant_crud_router() once. Modules with real extra
logic (applications, shareholders, gallery's nested images) keep their own
router.py instead of using this.
"""

from typing import Any, Generic, Optional, Type, TypeVar

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_tenant_scope, resolve_public_tenant
from app.db.session import get_db
from app.modules.tenants.models import Tenant

ModelT = TypeVar("ModelT")
CreateT = TypeVar("CreateT", bound=BaseModel)
UpdateT = TypeVar("UpdateT", bound=BaseModel)
OutT = TypeVar("OutT", bound=BaseModel)


class TenantCrudRouter(Generic[ModelT, CreateT, UpdateT, OutT]):
    def __init__(
        self,
        *,
        model: Type[ModelT],
        create_schema: Type[CreateT],
        update_schema: Type[UpdateT],
        out_schema: Type[OutT],
        prefix: str,
        tag: str,
        order_by: Optional[Any] = None,
        public_read: bool = True,
    ):
        self.model = model
        self.router = APIRouter(tags=[tag])
        self._order_by = order_by

        @self.router.get("/admin" + prefix, response_model=list[out_schema])
        def admin_list(
            tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)
        ) -> list[ModelT]:
            q = db.query(model).filter(model.tenant_id == tenant_id)
            if self._order_by is not None:
                q = q.order_by(self._order_by)
            return q.all()

        @self.router.post(
            "/admin" + prefix, response_model=out_schema, status_code=status.HTTP_201_CREATED
        )
        def admin_create(
            payload: create_schema,  # type: ignore[valid-type]
            tenant_id: int = Depends(get_tenant_scope),
            db: Session = Depends(get_db),
        ) -> ModelT:
            row = model(tenant_id=tenant_id, **payload.model_dump())
            db.add(row)
            db.commit()
            db.refresh(row)
            return row

        @self.router.get("/admin" + prefix + "/{row_id}", response_model=out_schema)
        def admin_get(
            row_id: int, tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)
        ) -> ModelT:
            return self._get_or_404(db, row_id, tenant_id)

        @self.router.patch("/admin" + prefix + "/{row_id}", response_model=out_schema)
        def admin_update(
            row_id: int,
            payload: update_schema,  # type: ignore[valid-type]
            tenant_id: int = Depends(get_tenant_scope),
            db: Session = Depends(get_db),
        ) -> ModelT:
            row = self._get_or_404(db, row_id, tenant_id)
            for field, value in payload.model_dump(exclude_unset=True).items():
                setattr(row, field, value)
            db.add(row)
            db.commit()
            db.refresh(row)
            return row

        @self.router.delete("/admin" + prefix + "/{row_id}", status_code=status.HTTP_204_NO_CONTENT)
        def admin_delete(
            row_id: int, tenant_id: int = Depends(get_tenant_scope), db: Session = Depends(get_db)
        ) -> None:
            row = self._get_or_404(db, row_id, tenant_id)
            db.delete(row)
            db.commit()

        if public_read:

            @self.router.get(prefix, response_model=list[out_schema])
            def public_list(
                tenant: Tenant = Depends(resolve_public_tenant), db: Session = Depends(get_db)
            ) -> list[ModelT]:
                q = db.query(model).filter(model.tenant_id == tenant.id)
                if self._order_by is not None:
                    q = q.order_by(self._order_by)
                return q.all()

    def _get_or_404(self, db: Session, row_id: int, tenant_id: int) -> ModelT:
        row = (
            db.query(self.model)
            .filter(self.model.id == row_id, self.model.tenant_id == tenant_id)
            .first()
        )
        if row is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
        return row
