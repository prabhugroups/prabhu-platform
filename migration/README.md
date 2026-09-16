# Data Migration

`scripts/migrate_tenant.py` migrates one legacy tenant's MySQL database +
`/uploads` folder into the consolidated platform's schema. It only **reads**
from the legacy source database — never writes to it — so it's safe to run
against a live production DB or a snapshot/replica.

## Status

Proven end-to-end against the one sample dataset available in this
workspace (`nepal-land-broker-api/nepallandbroker.sql`, loaded into a
throwaway MySQL instance): every table's row count matched exactly between
source and target, and spot-checks of the migrated theme colors, admin
account, and content-settings rows confirmed the data landed correctly. The
same script is ready to run against the other 6 tenants once their live DB
credentials and `/uploads` directories are available — that's a real
constraint of this environment (no access to production credentials), not a
gap in the tooling.

## Coverage

Migrates the 11 tables the pre-migration audit found byte-identical across
all 7 legacy tenants: `admins` → `admin_users`, `applications`, `contacts`,
`documents`, `galleries`+`images`, `general_settings` → `content_settings`,
`popups`, `portfolios`, `teams`, `themes` → tenant branding columns.

`shares`/`shareholders` and `locations` (present in 4 of 7 legacy tenants)
are migrated when present in the source DB — the sample dataset didn't
include them, so that path is implemented per the legacy schema documented
by the pre-migration audit but not yet proven against real data. Confirm
against one of those 4 tenants' real data before relying on it at cutover.

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
  --tenant-slug prabhusteels \
  --source-host <legacy-db-host> --source-port 3306 \
  --source-user <user> --source-password <password> \
  --source-db prabhusteel_db \
  --source-uploads-dir /path/to/legacy/prabhusteels-api/uploads
```

Prints a per-table row-count report (source vs. migrated) — verify every row
matches before treating that tenant's migration as complete.

## File uploads

Legacy paths like `uploads/applications/x.webp` are rewritten to
`uploads/<tenant_slug>/applications/x.webp` and the actual files copied from
`--source-uploads-dir` into the target's uploads volume. If a tenant's
uploads live on a remote server rather than a local path, `rsync` or `scp`
them down first, then point `--source-uploads-dir` at the local copy.
