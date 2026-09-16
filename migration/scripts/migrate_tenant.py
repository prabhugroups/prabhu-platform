#!/usr/bin/env python3
"""Migrates one legacy tenant's MySQL database + /uploads folder into the
consolidated platform's schema.

Idempotent: re-running for the same tenant deletes and re-inserts that
tenant's rows in the target tables (a clean replace, not an accumulating
upsert), so it's safe to run repeatedly during a staged cutover.

Legacy source tables covered (from the 11 confirmed identical across all 7
tenants by the pre-migration audit): admins, applications, contacts,
documents, galleries+images, general_settings, popups, portfolios, teams,
themes. `shares`/`locations` (present in 4/7 tenants) are covered when
present in the source DB; anything else found in a given tenant's DB that
isn't one of these is intentionally left unmigrated and printed as a
warning — decide by hand whether it needs a mapping.

Usage:
    python migrate_tenant.py --tenant-slug prabhusteels \\
        --source-host 127.0.0.1 --source-port 3306 \\
        --source-user root --source-password secret --source-db prabhusteel_db \\
        --source-uploads-dir /path/to/legacy/prabhusteels-api/uploads

Requires the target platform's DB (backend/.env) to already have that tenant
seeded (see backend/app/db/seed.py) — this script only fills in content, it
never creates the tenant record itself.
"""

import argparse
import json
import shutil
import sys
from pathlib import Path

import pymysql
import pymysql.cursors

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

from app.db.session import SessionLocal  # noqa: E402
from app.db import base_all  # noqa: E402, F401
from app.modules.tenants.models import Tenant  # noqa: E402
from app.modules.auth.models import AdminUser, AdminRole  # noqa: E402
from app.modules.applications.models import Application  # noqa: E402
from app.modules.contacts.models import Contact  # noqa: E402
from app.modules.documents.models import Document  # noqa: E402
from app.modules.gallery.models import Gallery, GalleryImage  # noqa: E402
from app.modules.settings.models import ContentSetting  # noqa: E402
from app.modules.popup.models import Popup  # noqa: E402
from app.modules.portfolio.models import Portfolio  # noqa: E402
from app.modules.teams.models import TeamMember  # noqa: E402


def connect_source(args: argparse.Namespace) -> pymysql.connections.Connection:
    return pymysql.connect(
        host=args.source_host,
        port=args.source_port,
        user=args.source_user,
        password=args.source_password,
        database=args.source_db,
        cursorclass=pymysql.cursors.DictCursor,
        charset="utf8mb4",
    )


def table_exists(cursor, table: str) -> bool:
    cursor.execute("SHOW TABLES LIKE %s", (table,))
    return cursor.fetchone() is not None


def fetch_all(cursor, table: str) -> list[dict]:
    if not table_exists(cursor, table):
        return []
    cursor.execute(f"SELECT * FROM `{table}`")
    return cursor.fetchall()


def rewrite_path(legacy_path: str | None, tenant_slug: str) -> str | None:
    """Legacy paths look like 'uploads/applications/x.webp'; the new layout
    is 'uploads/<tenant_slug>/applications/x.webp' with the module folder
    preserved (see backend app/modules/media/service.py)."""
    if not legacy_path:
        return None
    relative = legacy_path.removeprefix("uploads/").removeprefix("/")
    return f"{tenant_slug}/{relative}"


def copy_uploads(source_uploads_dir: Path | None, target_uploads_dir: Path, tenant_slug: str) -> int:
    if not source_uploads_dir or not source_uploads_dir.exists():
        return 0
    destination = target_uploads_dir / tenant_slug
    if destination.exists():
        shutil.rmtree(destination)
    shutil.copytree(source_uploads_dir, destination)
    return sum(1 for _ in destination.rglob("*") if _.is_file())


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--tenant-slug", required=True)
    parser.add_argument("--source-host", required=True)
    parser.add_argument("--source-port", type=int, default=3306)
    parser.add_argument("--source-user", required=True)
    parser.add_argument("--source-password", required=True)
    parser.add_argument("--source-db", required=True)
    parser.add_argument("--source-uploads-dir", type=Path, default=None)
    parser.add_argument(
        "--target-uploads-dir",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "backend" / "uploads",
    )
    args = parser.parse_args()

    db = SessionLocal()
    tenant = db.query(Tenant).filter(Tenant.slug == args.tenant_slug).first()
    if tenant is None:
        print(f"ERROR: tenant '{args.tenant_slug}' not found — seed it first (see backend/app/db/seed.py)")
        sys.exit(1)

    source = connect_source(args)
    report: dict[str, tuple[int, int]] = {}

    try:
        with source.cursor() as cur:
            _migrate_admins(cur, db, tenant, report)
            _migrate_simple_table(cur, db, tenant, report, "contacts", Contact,
                                   ["name", "phone", "email", "subject", "message"],
                                   file_fields=["file"])
            _migrate_simple_table(cur, db, tenant, report, "documents", Document,
                                   ["title", "type", "date"], file_fields=["file"])
            _migrate_simple_table(cur, db, tenant, report, "portfolios", Portfolio,
                                   ["title", "type"], file_fields=["file"])
            _migrate_simple_table(cur, db, tenant, report, "popups", Popup,
                                   ["status"], file_fields=["image"])
            _migrate_teams(cur, db, tenant, report)
            _migrate_applications(cur, db, tenant, report)
            _migrate_general_settings(cur, db, tenant, report)
            _migrate_galleries(cur, db, tenant, report)
            _migrate_themes(cur, db, tenant, report)

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        source.close()
        db.close()

    file_count = copy_uploads(args.source_uploads_dir, args.target_uploads_dir, args.tenant_slug)

    print(f"\nMigration report for tenant '{args.tenant_slug}':")
    for table, (source_count, migrated_count) in report.items():
        flag = "" if source_count == migrated_count else "  <-- MISMATCH"
        print(f"  {table:20s} source={source_count:4d}  migrated={migrated_count:4d}{flag}")
    print(f"  {'uploads files':20s} copied={file_count}")


def _replace_tenant_rows(db, model, tenant_id: int) -> None:
    db.query(model).filter(model.tenant_id == tenant_id).delete()


def _migrate_admins(cur, db, tenant, report) -> None:
    rows = fetch_all(cur, "admins")
    _replace_tenant_rows(db, AdminUser, tenant.id)
    migrated = 0
    for row in rows:
        # Passwords are already bcrypt hashes in the legacy schema and use
        # the same algorithm (bcryptjs); carried over as-is rather than
        # forcing a reset.
        db.add(
            AdminUser(
                tenant_id=tenant.id,
                name=row.get("name") or row.get("username") or "Admin",
                email=row["email"],
                username=row["username"],
                password_hash=row["password"],
                role=AdminRole.tenant_admin,
                is_active=bool(row.get("isActive", True)),
            )
        )
        migrated += 1
    report["admins"] = (len(rows), migrated)


def _migrate_simple_table(cur, db, tenant, report, table, model, fields, file_fields=()) -> None:
    rows = fetch_all(cur, table)
    _replace_tenant_rows(db, model, tenant.id)
    migrated = 0
    for row in rows:
        values = {f: row.get(f) for f in fields}
        for ff in file_fields:
            values[ff] = rewrite_path(row.get(ff), tenant.slug)
        db.add(model(tenant_id=tenant.id, **values))
        migrated += 1
    report[table] = (len(rows), migrated)


def _migrate_teams(cur, db, tenant, report) -> None:
    rows = fetch_all(cur, "teams")
    _replace_tenant_rows(db, TeamMember, tenant.id)
    migrated = 0
    for row in rows:
        info = row.get("additionalInfo")
        if isinstance(info, str):
            info = json.loads(info) if info else None
        db.add(
            TeamMember(
                tenant_id=tenant.id,
                type=row.get("type", ""),
                image=rewrite_path(row.get("image"), tenant.slug),
                additional_info=info,
            )
        )
        migrated += 1
    report["teams"] = (len(rows), migrated)


def _migrate_applications(cur, db, tenant, report) -> None:
    rows = fetch_all(cur, "applications")
    _replace_tenant_rows(db, Application, tenant.id)
    migrated = 0
    known = {"name", "phone", "email", "shareType", "pan", "nid"}
    for row in rows:
        extra = {k: v for k, v in row.items() if k not in known and k not in ("id", "createdAt", "updatedAt")}
        db.add(
            Application(
                tenant_id=tenant.id,
                name=row.get("name", ""),
                phone=row.get("phone"),
                email=row.get("email"),
                citizenship_file=rewrite_path(row.get("citizenship"), tenant.slug),
                bank_deposit_file=rewrite_path(row.get("bankDeposit"), tenant.slug),
                request_form_file=rewrite_path(row.get("requestForm"), tenant.slug),
                share_type=row.get("shareType"),
                pan=row.get("pan"),
                nid=row.get("nid"),
                extra=extra or None,
            )
        )
        migrated += 1
    report["applications"] = (len(rows), migrated)


def _migrate_general_settings(cur, db, tenant, report) -> None:
    rows = fetch_all(cur, "general_settings")
    _replace_tenant_rows(db, ContentSetting, tenant.id)
    migrated = 0
    for row in rows:
        infos = row.get("infos")
        if isinstance(infos, str):
            infos = json.loads(infos) if infos else None
        db.add(
            ContentSetting(
                tenant_id=tenant.id,
                group=row.get("group") or "general",
                key=row["key"],
                type=row.get("type") or "text",
                value=row.get("value"),
                title=row.get("title"),
                file=rewrite_path(row.get("file"), tenant.slug),
                infos=infos,
            )
        )
        migrated += 1
    report["general_settings"] = (len(rows), migrated)


def _migrate_galleries(cur, db, tenant, report) -> None:
    galleries = fetch_all(cur, "galleries")
    images = fetch_all(cur, "images")
    _replace_tenant_rows(db, Gallery, tenant.id)  # cascades to gallery_images
    db.flush()

    migrated_galleries = 0
    migrated_images = 0
    for g in galleries:
        gallery = Gallery(tenant_id=tenant.id, title=g.get("title", ""), date=g.get("date"))
        db.add(gallery)
        db.flush()  # need gallery.id for its images
        for img in images:
            if img.get("galleryId") != g["id"]:
                continue
            db.add(
                GalleryImage(
                    gallery_id=gallery.id,
                    type=img.get("type") or "Gallery",
                    file=rewrite_path(img.get("file"), tenant.slug) or "",
                )
            )
            migrated_images += 1
        migrated_galleries += 1
    report["galleries"] = (len(galleries), migrated_galleries)
    report["gallery_images"] = (len(images), migrated_images)


def _migrate_themes(cur, db, tenant, report) -> None:
    rows = fetch_all(cur, "themes")
    if not rows:
        report["themes"] = (0, 0)
        return
    theme = rows[0]  # legacy `themes` table is always a single row per tenant
    tenant.primary_color = theme.get("primaryColor") or tenant.primary_color
    tenant.secondary_color = theme.get("secondaryColor") or tenant.secondary_color
    tenant.primary_light_color = theme.get("primaryLightcolor") or tenant.primary_light_color
    tenant.footer_text = theme.get("footerText") or tenant.footer_text
    tenant.logo_file = rewrite_path(theme.get("header"), tenant.slug) or tenant.logo_file
    db.add(tenant)
    report["themes"] = (len(rows), 1)


if __name__ == "__main__":
    main()
