"""Idempotent seed script: an optional preset of tenants (SEED_TENANTS), the
Nepal locations reference data, and one initial super_admin.

Tenants are per deployment: each company running this platform has its
own. SEED_TENANTS names a preset in seed_data/tenant_presets/ (e.g.
`prabhu` — the 7 Prabhu Group sites and their legacy domains); unset or
`none` seeds no tenants, and they're created in the Super Admin console.

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

from app.core.config import get_settings
from app.core.security import hash_password
from app.db import base_all  # noqa: F401 — registers all models on Base.metadata
from app.db.session import Base, SessionLocal, engine
from app.modules.auth.models import AdminRole, AdminUser
from app.modules.locations.models import District, Municipality, Province
from app.modules.tenants.models import Tenant, TenantDomain

SEED_DATA_DIR = Path(__file__).parent / "seed_data" / "nepal_locations"
TENANT_PRESETS_DIR = Path(__file__).parent / "seed_data" / "tenant_presets"

# slug, name, domains (apex first = primary), shareholder_module_enabled

def available_tenant_presets() -> list[str]:
    return sorted(p.stem for p in TENANT_PRESETS_DIR.glob("*.json"))


def seed_tenants(db: Session, preset: str) -> None:
    """Creates the preset's tenants (domains: first = primary) that don't
    exist yet, by slug. Never modifies or removes existing tenants, so it's
    safe on every deploy and after tenants are edited in the console."""
    preset = preset.strip().lower()
    if preset in ("", "none"):
        print("SEED_TENANTS not set — no tenants seeded (create them in the Super Admin console)")
        return
    # Matched against the directory listing, never joined into a path, so
    # the env value can't point outside tenant_presets/.
    if preset not in available_tenant_presets():
        raise SystemExit(
            f"Unknown SEED_TENANTS preset '{preset}'. "
            f"Available: {', '.join(available_tenant_presets()) or '(none)'}, or 'none'."
        )
    entries = json.loads((TENANT_PRESETS_DIR / f"{preset}.json").read_text())["tenants"]
    for entry in entries:
        if db.query(Tenant).filter(Tenant.slug == entry["slug"]).first():
            continue
        tenant = Tenant(
            slug=entry["slug"],
            name=entry["name"],
            shareholder_module_enabled=entry.get("shareholder_module_enabled", False),
        )
        for i, hostname in enumerate(entry.get("domains", [])):
            tenant.domains.append(TenantDomain(hostname=hostname, is_primary=(i == 0)))
        db.add(tenant)
    db.commit()
    print(f"Tenants: {db.query(Tenant).count()} present (preset '{preset}')")


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
        # `or`, not a .get default: Compose passes unset values as "".
        email=os.environ.get("SEED_SUPER_ADMIN_EMAIL") or "superadmin@example.com",
        username=os.environ.get("SEED_SUPER_ADMIN_USERNAME") or "superadmin",
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
        seed_tenants(db, get_settings().seed_tenants)
        seed_locations(db)
        seed_super_admin(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
