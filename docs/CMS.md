# CMS

How the centralized CMS works, who can do what, and how to configure a
tenant's branding and content.

## Roles

There is one `admin_users` table for both roles (see
`backend/app/modules/auth/models.py`):

| Role | Scope | Where they sign in | Where they land |
|---|---|---|---|
| `super_admin` | Every tenant | The Super Admin domain (`SUPER_ADMIN_DOMAIN`) | `/super-admin/tenants` |
| `tenant_admin` | Exactly one tenant | That tenant's own domain, at `/admin/login` | `/admin/dashboard` |

A `super_admin` row always has `tenant_id = NULL`; a `tenant_admin` row
always has one set — enforced by a DB check constraint, not just application
code. There's no third "editor"/"viewer" role by design (see
`docs/ARCHITECTURE.md` for why the platform doesn't over-model RBAC beyond
what the brief asked for); if you need one later, it's a new value in the
`AdminRole` enum plus a permission check, not a schema redesign.

**Super Admin can't casually browse a tenant's CMS.** Visiting `/admin/*`
as a `super_admin` redirects to `/super-admin/tenants` instead
(`frontend/src/lib/require-session.ts`) — tenant content management is a
`tenant_admin`'s job by design. What Super Admin *can* do, from
`/super-admin`:

- Create/deactivate tenants, set their branding defaults and
  `shareholder_module_enabled` flag.
- Add/remove the hostnames (domains) that route to a tenant.
- Create/deactivate admin users of either role, for any tenant.

## How sign-in works

`POST /auth/login` (FastAPI) verifies the password (bcrypt) and returns a
JWT (`{sub, role, tenant_id}`, HS256, `JWT_SECRET`). The Next.js Server
Action at `frontend/src/app/admin/login/actions.ts` stores that JWT in an
**httpOnly** cookie (`frontend/src/lib/session.ts`) — it's never readable
from client-side JavaScript. Every subsequent admin page is a React Server
Component that reads the cookie server-side and calls FastAPI with
`Authorization: Bearer <token>`.

The cookie also carries a plaintext `role`/`tenantId` alongside the token,
but **only as a UI convenience** (which sidebar to render) — it is never the
security boundary. FastAPI re-derives `role`/`tenant_id` from the verified
JWT on every single request (`backend/app/core/deps.py:get_tenant_scope`),
so a tampered cookie can't grant access the JWT itself doesn't already
grant. See `docs/ARCHITECTURE.md` for the full tenant-isolation model and
`backend/tests/test_tenant_isolation.py` for the tests that prove it holds.

Sessions last 12 hours (`JWT_EXPIRES_MINUTES`, backend `.env`) and there is
no refresh-token flow — signing back in is the only way to extend a session.
This is a deliberate simplification, not an oversight (see
`docs/ARCHITECTURE.md`'s "no over-engineering" stance): rotating
`JWT_SECRET` invalidates every session instantly, which is a feature during
an incident, not something a refresh-token flow would let you do as easily.

## Content model — what a Tenant Admin actually edits

Everything a tenant's public site shows is tenant-scoped data behind one of
these modules (`backend/app/modules/*`, mirrored 1:1 by
`frontend/src/app/admin/(dashboard)/*`):

| Module | What it is | Admin page |
|---|---|---|
| **Content & SEO** | The flexible `group`/`key`/`value`/`file`/`infos`(JSON) table — hero banner text+image, homepage intro copy, per-page SEO title/description. Not a fixed schema: add any `group`/`key` pair and the public site's `publicGet(slug, "/public/settings/<key>")` calls just work. | `/admin/settings` |
| **Navigation** | Header/footer menu items, one level of dropdown nesting (`parent_id`). Replaces what used to be hardcoded per-tenant in the legacy frontends. | `/admin/nav-items` |
| **Team** | Board of directors / management, photo + free-form JSON details (name/title/bio). | `/admin/teams` |
| **Documents** | Notices, AGM minutes, annual reports — typed (`notice`/`legal`) so the public `/notice` and `/legal` pages can filter. | `/admin/documents` |
| **Gallery** | Photo albums, each with its own set of images (upload multiple, delete individually). | `/admin/gallery` |
| **Portfolio** | Project/asset showcase grid on the homepage and `/portfolio`. | `/admin/portfolio` |
| **Popups** | One site-wide modal banner; toggle `Active` on the one you want showing. | `/admin/popups` |
| **FAQs** | Question/answer pairs, optional category grouping, rendered as an accordion. | `/admin/faqs` |
| **Contact Submissions** | Read-only inbox of `/contact` form submissions — never publicly listable. | `/admin/contacts` |
| **Applications** | Public "request shares" / "apply for membership" intake — approve/reject. | `/admin/applications` |
| **Shareholders** | Full statutory registry (only if `shareholder_module_enabled`) — see below. | `/admin/shareholders` |

All of these use the same shape: list, create (a modal form), edit, delete.
`frontend/src/components/admin/ResourceManager.tsx` is one generic
component that renders all of them from a small field-config array per
module (`frontend/src/app/admin/(dashboard)/<module>/page.tsx`) — it was
written once because the pre-migration audit confirmed these tables really
are that uniform across all 7 legacy tenants, not because uniformity was
assumed going in.

### Branding (Super Admin only)

Colors, logo, favicon, font, default OG image, and footer text live on the
`tenants` row itself, not in `content_settings` — every tenant has exactly
one of each, always, so a flat set of columns fit better than a key-value
table (see `backend/app/modules/tenants/models.py`). Edited from
`/super-admin/tenants`, injected into every page as CSS custom properties
(`--color-primary` etc.) by `frontend/src/app/(site)/layout.tsx`.

### Media uploads

Any field marked as an image/file in the admin UI uploads through
`POST /admin/media/upload?module=<name>` as real `multipart/form-data` —
not the legacy base64-in-JSON approach. FastAPI validates type/size,
converts images to WebP (Pillow + pillow-heif for iPhone HEIC), and stores
them at `uploads/<tenant_slug>/<module>/<uuid>.webp`, returning the relative
path to store on the owning row. The public site and admin UI both resolve
that path to a URL via `mediaUrl()` (`/media/<path>`), which in production
Traefik routes straight to FastAPI's static file mount (see
`docs/TRAEFIK.md`) — browsers never call FastAPI's API directly, only this
one static path.

### The shareholder registry module

Feature-flagged per tenant (`tenants.shareholder_module_enabled`, toggled
from `/super-admin/tenants`) because only 4 of the 7 legacy tenants had it.
When off, `/admin/shareholders` shows a message instead of the module
(backend returns `403`); the public site shows the simpler "Request Shares"
form (`/request-share`) instead of "Apply for Membership"
(`/apply-membership`) — both post to the same `applications` intake table,
just with different copy and (for the fuller flow) a few extra fields
folded into `applications.extra` (JSON) rather than fixed columns, since the
legacy schema's fixed extra columns famously didn't make sense for every
tenant (a land-broker company had an "advocacy license number" field —
see `docs/ARCHITECTURE.md`).

The full registry schema (citizenship, bank/demat, address, nominees) is
modeled in the database and exposed by the API
(`backend/app/modules/shareholders/`), but the current admin UI only
surfaces the core shareholder fields (name, PAN, share number/amount, etc.)
— stated directly on that admin page rather than silently left out. Wiring
the nested sub-records into the UI is the natural next increment there.
