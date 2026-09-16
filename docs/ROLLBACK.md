# Rollback

## Why this is low-risk

Every one of the 14 legacy repos and their databases stays exactly where it
is, untouched, for the entire migration. Nothing about building or deploying
this platform modifies, deletes, or even connects write access to any legacy
system — the migration script (`migration/scripts/migrate_tenant.py`) only
**reads** from a legacy tenant's database. Cutover happens per tenant, not
all-at-once, so a problem with one tenant never affects the other six.

## Per-tenant cutover sequence

1. Run `migrate_tenant.py` for that tenant against a copy/snapshot of its
   production DB while the legacy site keeps serving live traffic
   unaffected.
2. Validate the migrated tenant on the new stack via a staging hostname or a
   local `/etc/hosts` override — not yet the real domain.
3. Re-run the migration once more against a fresh snapshot close to cutover
   time (it's a clean replace, not an accumulating upsert — see
   `migration/README.md`), to catch anything written between step 1 and now.
4. Flip that one tenant's DNS record (or the Traefik router, if DNS already
   points at the new server) to the new stack.
5. Monitor. Keep the legacy stack running, untouched, for a rollback window
   (recommended: at least 7 days) before decommissioning it.

## Rolling back one tenant

Because cutover is just a DNS/router flip, rollback is the same operation in
reverse:

1. Point that tenant's DNS record back at its legacy server (or remove /
   revert its router block in `infra/traefik/dynamic/routers.yml.template`
   and restore the legacy container's exposure).
2. The legacy stack was never stopped, so it's immediately serving traffic
   again with whatever data it had — nothing to restore.
3. Any content edited through the new CMS during the rollback window is not
   automatically carried back to the legacy system; treat it as a manual
   note for a later re-attempt, not a data-loss event (the new platform's DB
   still has it).

## Rolling back the whole platform

Not expected to be necessary given the per-tenant approach, but if it is:
stop routing any domain at the new Traefik/Next.js/FastAPI/MySQL stack (all
domains point back to their legacy servers) and leave the new stack running
or torn down at your discretion — none of the legacy systems were ever
modified, so there is nothing to "undo" on their side.

## What's NOT reversible

- Content created **only** in the new CMS (never existed in the legacy
  system) — e.g. an admin_user edits a page after cutover, then you roll
  back to legacy. That edit isn't in the legacy DB. This is inherent to any
  cutover with live content; the mitigation is a short rollback window and
  re-applying important edits by hand if a rollback is needed.
- The legacy systems' own forward progress during the rollback window (a
  legacy contact-form submission received while traffic was on the new
  stack won't exist in the legacy DB either — it's in the new one instead).
