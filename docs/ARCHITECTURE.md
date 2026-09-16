# Architecture

## Why this exists

7 Prabhu Group subsidiaries each ran an independently-deployed website: a
Next.js frontend + a Bun/Elysia/Sequelize/MySQL backend, one full stack per
tenant, 14 repositories total. A pre-migration audit of all 14 repos found
they were **the same codebase forked 7 times** — byte-identical schemas for
11 CMS tables, identical components, identical auth model — with only two
real differences: a shareholder-KYC registry module present in 4 of 7
tenants, and cosmetic branding. The audit also found concrete bugs from that
copy-paste history: identical secrets committed across every tenant, a
never-satisfiable "user" role, an active CORS misconfiguration in two
tenants, wrong-brand SEO fallback strings in six of seven frontends, and no
structured data anywhere.

This platform replaces all 14 repos with one modular monolith.

## Topology

```
7 tenant domains + 1 admin domain → Traefik (TLS) → Next.js (only public entrypoint)
                                                          │  (docker-internal network only)
                                                          ▼
                                                     FastAPI
                                                          │
                                                     MySQL (single DB, tenant_id-scoped tables)
```

**FastAPI is never exposed to the internet.** Only the Next.js container is
routed by Traefik (plus one narrow `/media/*` path straight to FastAPI's
static file mount, since that's the one thing browsers need to fetch
directly). Next.js calls FastAPI server-side over the docker network for
everything else — SSR data fetching, admin CMS actions, and public form
submits via Server Actions. This removes the CORS-misconfiguration bug class
entirely: there is no public CORS surface to misconfigure.

No Redis, no queue, no per-tenant database, no Kubernetes. 7 tenants running
simple CMS content don't need them — see the "no over-engineering" constraint
in the original brief. Tenant lookups are a plain indexed query against a
7-row table.

## Database

One MySQL schema, every tenant-owned table carries a `tenant_id` FK
(`ON DELETE CASCADE`). Key tables:

- `tenants` / `tenant_domains` — branding + the Host-header → tenant mapping.
- `admin_users` — single table for both roles; `super_admin` rows have
  `tenant_id IS NULL`, `tenant_admin` rows require one (DB check constraint).
- `content_settings` — the flexible group/key/value/file/infos(JSON) table
  that was already proven across all 7 legacy tenants to cover arbitrary
  content (hero banners, about-us copy, per-page SEO records, theme assets)
  without a schema change per content type. Kept deliberately, not replaced
  with bespoke tables.
- `nav_items`, `teams`, `documents`, `galleries`+`gallery_images`,
  `portfolios`, `popups`, `contacts`, `applications`, `faqs` — direct ports
  of the 11 CMS tables the audit found identical across all 7 tenants.
- `shareholders` + 5 child tables — the full statutory shareholder registry,
  feature-flagged per tenant via `tenants.shareholder_module_enabled` (4 of
  7 legacy tenants had this; the other 3 keep the simpler `applications`
  intake only, matching today's real split).
- `locations_provinces` / `_districts` / `_municipalities` — global Nepal
  reference data, seeded once instead of duplicated per tenant.

See `backend/app/modules/*/models.py` for exact columns; `backend/app/db/seed.py`
seeds the 7 known tenants + this reference data + one super_admin.

## Backend — FastAPI modular monolith

`backend/app/modules/<name>/{models,schemas,repository via ORM,router}.py`,
one module per bounded context. `app/core/crud.py` is a generic tenant-scoped
CRUD router factory used by the ~7 modules that are pure list/create/get/
update/delete (teams, documents, portfolios, popups, nav_items, faqs) —
written once instead of by hand seven times, because the audit confirmed
those tables really are that uniform.

### RBAC / tenant isolation

JWT payload: `{sub, role, tenant_id}`. `app/core/deps.py:get_tenant_scope()`
is the enforcement point: for `tenant_admin` it **always** returns the
tenant_id embedded in the verified JWT — a client-supplied `X-Tenant-Id`
header is ignored outright, never trusted. `super_admin` must supply
`X-Tenant-Id` explicitly to act on a specific tenant, or call the dedicated
cross-tenant `/super/*` endpoints. This is covered by
`backend/tests/test_tenant_isolation.py`, which asserts a tenant_admin token
can never read/write/enumerate another tenant's rows, including via a
spoofed header or a guessed row id.

### Media

Real `multipart/form-data` uploads (not the legacy base64-in-JSON approach),
validated and converted to WebP via Pillow + pillow-heif (HEIC support),
stored at `uploads/<tenant_slug>/<module>/...`, served back by FastAPI's
`StaticFiles` at `/media/*`.

## Frontend — Next.js (single consolidated app)

- `src/proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`) resolves
  the tenant from the incoming Host header via
  `GET /internal/tenants/by-domain/{host}` and forwards `x-tenant-slug` to
  every downstream server call. `/admin/*` and `/super-admin/*` are exempt —
  they use cookie sessions, not tenant-domain resolution, since the Super
  Admin console is meant to live on its own operator-only domain.
- `(site)/layout.tsx` fetches the tenant once per request (`getTenant()`,
  wrapped in React `cache()`), injects `--color-primary` etc. as CSS custom
  properties, sets per-tenant metadata (title, OG image, favicon), and emits
  an Organization JSON-LD block — all gaps the audit found missing or broken
  in the legacy frontends (hardcoded `"Prabhu Steels - ..."` fallback
  strings shipped to 6 of 7 tenants; no structured data anywhere).
- Admin CMS: `app/admin/(dashboard)/*` for `tenant_admin` (guarded by
  `requireTenantAdmin()`), `app/super-admin/*` for `super_admin` (guarded by
  `requireSuperAdmin()`). `components/admin/ResourceManager.tsx` is a
  generic table+modal-form component reused across the simple CMS modules,
  mirroring the backend's generic CRUD router. See `docs/CMS.md` for the
  full role model, sign-in flow, and what each CMS module actually edits.
- Public form submits (contact, share/membership applications) are React
  Server Actions, not client-side calls to FastAPI — the browser only ever
  talks to the Next.js server.

## Traefik

One router per tenant hostname (apex + www) → `frontend`; one path router
for `/media` → `backend`; one router for the Super Admin console on its own
domain (`SUPER_ADMIN_DOMAIN`, a real DNS record you create at deploy time —
not guessed here). Let's Encrypt via ACME HTTP-01 (no wildcard cert needed —
7 distinct apex domains). See `infra/traefik/` and `docs/TRAEFIK.md` for the
full routing/TLS/domain-onboarding details.

## What's intentionally deferred

- **Nested shareholder sub-records** (citizenship/bank/nominee/address) are
  fully modeled in the DB and API but the admin UI currently only surfaces
  the core shareholder fields — flagged directly in
  `frontend/src/app/admin/(dashboard)/shareholders/page.tsx` rather than
  silently left out.
- **Multi-replica scaling** — the in-memory rate limiter
  (`backend/app/core/rate_limit.py`) is per-process, fine for the single
  backend instance this topology runs; would need revisiting only if you
  ever actually needed more than one backend replica.
