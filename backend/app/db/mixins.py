import datetime

from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    created_at: Mapped[datetime.datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime.datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )


# Every tenant-owned table declares its own:
#   tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
# (SQLAlchemy 2.0 typed mapped_column doesn't factor cleanly through a mixin method,
# so this is a documented pattern rather than inherited — see app/modules/*/models.py)
