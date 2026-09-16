"""Idempotent seed script: the 7 known Prabhu Group tenants + their real
domains (from each legacy repo's next.config.ts/env.example), the Nepal
locations reference data, and one initial super_admin.

Branding colors are seeded with the legacy fallback defaults (#0059ab /
#17ad4c / #4a90e2) — the one real production theme row we could inspect
(nepal-land-broker-api/nepallandbroker.sql) never actually overrode them, so
there is no evidence any tenant customized branding in practice. Real
per-tenant branding should be set via the Super Admin console once live.

Run with: python -m app.db.seed
"""

import json
import os
import sys
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db import base_all  # noqa: F401 — registers all models on Base.metadata
from app.db.session import Base, SessionLocal, engine
from app.modules.auth.models import AdminRole, AdminUser
from app.modules.locations.models import District, Municipality, Province
from app.modules.tenants.models import Tenant, TenantDomain

SEED_DATA_DIR = Path(__file__).parent / "seed_data" / "nepal_locations"

# slug, name, domains (apex first = primary), shareholder_module_enabled
TENANTS = [
    ("hydro-holdings", "Hydro Holdings", ["holdingshydro.com", "www.holdingshydro.com"], False),
    (
        "ichchhakamana",
        "Ichchhakamana Cable Car",
        ["ichchhakamanacablecar.com", "www.ichchhakamanacablecar.com"],
        True,
    ),
    ("nepal-land-broker", "Nepal Land Broker", ["nepallandbroker.com", "www.nepallandbroker.com"], True),
    ("prabhucablecar", "Prabhu Cable Car", ["prabhucablecar.com", "www.prabhucablecar.com"], False),
    ("prabhu-holdings", "Prabhu Holdings", ["holdingsprabhu.com", "www.holdingsprabhu.com"], False),
    ("prabhusteels", "Prabhu Steels", ["prabhusteel.com", "www.prabhusteel.com"], True),
    ("ranimahal", "Ranimahal Cable Car", ["ranimahalcablecar.com", "www.ranimahalcablecar.com"], True),
]


def seed_tenants(db: Session) -> None:
    for slug, name, domains, shareholder_enabled in TENANTS:
        if db.query(Tenant).filter(Tenant.slug == slug).first():
            continue
        tenant = Tenant(slug=slug, name=name, shareholder_module_enabled=shareholder_enabled)
        for i, hostname in enumerate(domains):
            tenant.domains.append(TenantDomain(hostname=hostname, is_primary=(i == 0)))
        db.add(tenant)
    db.commit()
    print(f"Tenants: {db.query(Tenant).count()} present")


def seed_locations(db: Session) -> None:
    if db.query(Province).count() > 0:
        print("Locations already seeded, skipping")
        return

    provinces_data = json.loads((SEED_DATA_DIR / "provinces.json").read_text())["provinces"]
    province_rows: dict[str, Province] = {}
    for name in provinces_data:
        row = Province(name=name)
        db.add(row)
        province_rows[name] = row
    db.flush()

    district_rows: dict[str, District] = {}
    for province_name, province_row in province_rows.items():
        district_file = SEED_DATA_DIR / "districtsByProvince" / f"{province_name}.json"
        if not district_file.exists():
            continue
        for district_name in json.loads(district_file.read_text())["districts"]:
            row = District(province_id=province_row.id, name=district_name)
            db.add(row)
            district_rows[district_name] = row
    db.flush()

    municipality_count = 0
    for district_name, district_row in district_rows.items():
        municipality_file = SEED_DATA_DIR / "municipalsByDistrict" / f"{district_name}.json"
        if not municipality_file.exists():
            continue
        for municipality_name in json.loads(municipality_file.read_text())["municipals"]:
            db.add(Municipality(district_id=district_row.id, name=municipality_name))
            municipality_count += 1
    db.commit()
    print(
        f"Locations seeded: {len(province_rows)} provinces, "
        f"{len(district_rows)} districts, {municipality_count} municipalities"
    )


def seed_super_admin(db: Session) -> None:
    if db.query(AdminUser).filter(AdminUser.role == AdminRole.super_admin).first():
        print("Super admin already exists, skipping")
        return
    password = os.environ.get("SEED_SUPER_ADMIN_PASSWORD")
    if not password:
        print("SEED_SUPER_ADMIN_PASSWORD not set — skipping super admin creation", file=sys.stderr)
        return
    admin = AdminUser(
        tenant_id=None,
        name="Platform Super Admin",
        email=os.environ.get("SEED_SUPER_ADMIN_EMAIL", "superadmin@prabhugroup.com"),
        username=os.environ.get("SEED_SUPER_ADMIN_USERNAME", "superadmin"),
        password_hash=hash_password(password),
        role=AdminRole.super_admin,
    )
    db.add(admin)
    db.commit()
    print(f"Created super admin '{admin.username}'")


def main() -> None:
    Base.metadata.create_all(bind=engine)  # no-op once Alembic migrations have run
    db = SessionLocal()
    try:
        seed_tenants(db)
        seed_locations(db)
        seed_super_admin(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
