# Data Migration

`scripts/migrate_tenant.py` migrates one legacy tenant's MySQL database +
`/uploads` folder into the consolidated platform's schema. It only **reads**
from the legacy source database — never writes to it — so it's safe to run
against a live production DB or a snapshot/replica.

## Status

Proven end-to-end against two real datasets:

- `nepal-land-broker-api/nepallandbroker.sql`, loaded into a throwaway MySQL
  instance.
- The live local `prabhu_holdings` database, migrated into the `prabhu-holdings`
  tenant (id 5).

In both cases every table's row count matched exactly between source and
target, and spot-checks of the migrated theme colors, admin account,
content-settings, documents, portfolios, and team rows confirmed the data
(and rewritten upload paths) landed correctly. The same script is ready to
run against the remaining 5 tenants once their live DB credentials and
`/uploads` directories are available.

## Coverage

Migrates the 11 tables the pre-migration audit found byte-identical across
all 7 legacy tenants: `admins` → `admin_users`, `applications`, `contacts`,
`documents`, `galleries`+`images`, `general_settings` → `content_settings`,
`popups`, `portfolios`, `teams`, `themes` → tenant branding columns.

`shares`/`shareholders` (present in the 4 of 7 legacy tenants with
`shareholder_module_enabled=True`: ichchhakamana, nepal-land-broker,
prabhusteels, ranimahal) is **not migrated yet** — its legacy shape
(citizenship/national-id/address sub-records) hasn't been mapped to the
target `shareholders` module. Implement and prove that mapping before
running this script at cutover for any of those 4 tenants.

Anything in a tenant's legacy DB that isn't one of the tables above is
intentionally left unmigrated — the script only touches tables it explicitly
knows how to map.

## Idempotency

Re-running for the same `--tenant-slug` **replaces** that tenant's rows in
the target tables (delete-then-insert within a transaction), not an
accumulating upsert. Safe to re-run as many times as needed — e.g. once
early to validate, then again right before cutover to pick up anything
written in between.

## Running it

```bash
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt  # if not already done
# Target tenant must already exist — see backend/app/db/seed.py

.venv/bin/python ../migration/scripts/migrate_tenant.py \
  --tenant prabhusteels \
  --source-host <legacy-db-host> --source-port 3306 \
  --source-user <user> --source-password <password> \
  --source-db prabhusteel_db \
  --source-uploads-dir /path/to/legacy/prabhusteels-api/uploads
```

`--tenant` takes a numeric id, a slug, or a display name — e.g. `5`,
`prabhu-holdings`, or `"Prabhu Holdings"` all resolve to the same tenant.
Any of `--tenant`, `--source-host`, `--source-user`, `--source-db`,
`--source-password` can instead be left out: each falls back to its
`LEGACY_DB_*` environment variable (`LEGACY_DB_HOST`, `LEGACY_DB_USER`,
`LEGACY_DB_NAME`, `LEGACY_DB_PASSWORD`), and if still unset and the
terminal is interactive, the script prompts for it (the password prompt is
hidden). Non-interactive runs (CI) must supply everything via flags or env
vars.

Prints a per-table row-count report (source vs. migrated) — verify every row
matches before treating that tenant's migration as complete.

## File uploads

Legacy paths like `uploads/applications/x.webp` are rewritten to
`uploads/<tenant_slug>/applications/x.webp` and the actual files copied from
`--source-uploads-dir` into the target's uploads volume. If a tenant's
uploads live on a remote server rather than a local path, `rsync` or `scp`
them down first, then point `--source-uploads-dir` at the local copy.
