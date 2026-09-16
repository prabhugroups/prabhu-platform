# Traefik

How routing, TLS, and domain onboarding work. Config lives in
`infra/traefik/`.

## Why Traefik, and why this shape

One reverse proxy in front of two backend services (`frontend`, `backend`),
terminating TLS for 8 hostnames (7 tenant domains + 1 Super Admin domain).
No Docker-socket / label-based service discovery is used — with a fixed,
small set of domains, an explicit file-based router list
(`infra/traefik/dynamic/routers.yml.template`) is simpler to read, diff in
a PR, and reason about than labels scattered across `docker-compose.yml`,
and it means Traefik never needs `docker.sock` mounted (smaller attack
surface — Traefik can't enumerate or control other containers).

## Files

```
infra/traefik/
  traefik.yml                    static config: entrypoints, ACME, providers
  entrypoint.sh                  renders the one templated value, then execs traefik
  dynamic/
    routers.yml.template          the actual routing rules (see below)
```

### `traefik.yml` (static)

- `entryPoints.web` (`:80`) redirects everything to `entryPoints.websecure` (`:443`).
- `providers.file` watches `/etc/traefik/dynamic` — editing
  `routers.yml` there is picked up live, **no Traefik restart needed**.
- `certificatesResolvers.letsencrypt` uses ACME **HTTP-01** (not DNS-01):
  each domain proves ownership by serving a challenge file over plain HTTP,
  which is why `:80` must stay reachable from the internet even though it
  immediately redirects. No wildcard cert is needed since there are 7
  distinct apex domains, not subdomains of one domain.
- The ACME account email is **not** set in this file — Traefik's own YAML
  config isn't env-var-interpolated, so it's passed as a command-line flag
  in `docker-compose.yml` instead: `--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}`
  (compose *does* substitute `${...}` there).

### `entrypoint.sh` + the `${SUPER_ADMIN_DOMAIN}` template

Same env-var-interpolation gap applies to the dynamic config file, so
`routers.yml.template` is checked in with a literal `${SUPER_ADMIN_DOMAIN}`
placeholder, and a small `sed`-based entrypoint script renders it into
`routers.yml` (the file Traefik actually reads) on container start, using
the `SUPER_ADMIN_DOMAIN` env var from `docker-compose.yml`. This is
deliberately a shell one-liner, not a templating engine or a custom Traefik
build — one variable didn't justify either.

### `dynamic/routers.yml.template`

One router per tenant hostname (apex + `www`), all pointing at the
`frontend` service:

```yaml
prabhusteels:
  rule: "Host(`prabhusteel.com`) || Host(`www.prabhusteel.com`)"
  entryPoints: [websecure]
  service: frontend
  tls: { certResolver: letsencrypt }
```

Plus one path-scoped router that's the **only** way FastAPI is ever reached
from the public internet:

```yaml
media:
  rule: "PathPrefix(`/media`)"
  entryPoints: [websecure]
  service: backend
  tls: { certResolver: letsencrypt }
  priority: 100   # must win over any tenant's Host-only router
```

Everything else the frontend needs from the backend (page data, admin
actions, form submits) happens server-side over the docker-internal network
(`http://backend:8000`), never through Traefik — see
`backend/app/main.py`'s comment on why there's no CORS middleware as a
result, and `docs/ARCHITECTURE.md` for the full request-flow diagram.

The `services` block at the bottom just names the two upstreams:

```yaml
services:
  frontend: { loadBalancer: { servers: [{ url: "http://frontend:3000" }] } }
  backend:  { loadBalancer: { servers: [{ url: "http://backend:8000" }] } }
```

## Onboarding a new domain

Two things have to happen together, or the domain either won't route or
won't resolve to the right tenant:

1. **Traefik**: add a router block to `routers.yml.template` for the new
   hostname (copy an existing tenant's block, or add the hostname to an
   existing tenant's `Host(...)` rule if it's an alternate domain for a
   tenant that already exists), then redeploy just that file — Traefik picks
   it up live, no restart.
2. **Application**: add the same hostname as a `tenant_domains` row for that
   tenant — via the Super Admin console (Tenants → expand a tenant → add
   under Domains) or `POST /super/tenants/{id}/domains`. This is what
   `frontend/src/proxy.ts` actually checks (via
   `GET /internal/tenants/by-domain/{host}`) to decide which tenant's
   content to render — Traefik routing a domain to the `frontend` service
   doesn't by itself make the app recognize it.

Don't forget the DNS record itself, pointed at the server's IP, before
either step matters in practice.

## The Super Admin domain

`SUPER_ADMIN_DOMAIN` (set in `infra/.env`) is **not** one of the 7 tenant
domains — it's a separate operator-only hostname you own (e.g.
`platform-admin.yourcompany.com`) that also routes to `frontend`, but where
`/super-admin/*` is reachable. `frontend/src/proxy.ts` explicitly skips
tenant-domain resolution for `/admin/*` and `/super-admin/*` paths (both use
cookie sessions, not the tenant-slug header), specifically so this domain
never gets redirected to the tenant-not-found page just because it isn't a
registered tenant. Point real DNS at it and set the env var before
deploying — there's no hardcoded fallback domain, on purpose (guessing one
would be worse than requiring you to set it).

## Rate limiting & headers

Every public router in `routers.yml.template` chains four middlewares
(defined once at the top of that file, under `http.middlewares`):

- **`security-headers`**: HSTS, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `X-Frame-Options: DENY`, and a restrictive
  `Permissions-Policy`. CSP itself is set by Next.js
  (`frontend/next.config.ts`), not here — Traefik has no visibility into
  the app's actual script/style sources, and Next's `headers()` also covers
  local `next dev`/`next start` where Traefik isn't in the loop at all.
- **`rate-limit`** / **`super-admin-rate-limit`**: Traefik's native
  `rateLimit` (average + burst, per source IP). The Super Admin console
  gets a much tighter budget (10 avg / 20 burst vs. 50 / 100) since it's a
  pure admin-login surface, not public CMS traffic.
- **`in-flight`**: caps concurrent open connections per source IP
  (`inFlightReq`) — mitigates slowloris-style connection exhaustion.
- **`buffering`**: caps request body size at the edge
  (`maxRequestBodyBytes`, set just above the backend's own
  `max_upload_bytes`) so an oversized body is rejected before it reaches
  Next.js or FastAPI at all.

These stop **application-layer** abuse (scraping, brute force, slow-request
exhaustion) against a single small VM. They cannot stop a **volumetric**
DDoS flood from saturating the VM's network link — that requires something
in front of the origin; see `docs/SECURITY.md` for the Cloudflare setup this
platform is designed to sit behind.

Tune the numbers in `routers.yml.template`'s `http.middlewares` block if
real traffic patterns turn out to need it — they're conservative defaults
for "7 low-traffic corporate sites," not measured against production load.

### Real client IPs behind Cloudflare

`traefik.yml`'s `entryPoints.*.forwardedHeaders.trustedIPs` is pre-populated
with Cloudflare's published proxy IP ranges. This only matters once DNS is
switched to Cloudflare's proxied (orange-cloud) mode: it tells Traefik to
trust `X-Forwarded-For` **only** when the connection actually comes from
Cloudflare, so the `rate-limit`/`in-flight` middlewares above (and the
backend's own login throttle) see each visitor's real IP instead of
Cloudflare's edge IP for every request. Before that switch, it's inert —
Traefik falls back to the real TCP peer IP for anyone connecting directly.

## Local development

There's no Traefik in the local dev loop (`docs/RUNBOOK.md`) — `next dev`
and `uvicorn` are run directly on different ports, and tenant resolution is
exercised with a `Host:` header on requests (`curl -H "Host: ..."`) or
`/etc/hosts` entries pointing the real domains at `127.0.0.1`. The
`docker-compose.dev.yml` override does still run Traefik if you're testing
the containerized stack, but for day-to-day frontend/backend iteration it's
unnecessary overhead.

## Troubleshooting

- **Certificate not issuing**: confirm port `80` (not just `443`) is
  reachable from the public internet for that domain — HTTP-01 fails
  silently behind a firewall that only opens `443`. Check
  `docker compose logs traefik` for ACME errors; the account/cert state
  lives in the `traefik_acme` volume (`/letsencrypt/acme.json`).
- **Domain 404s / redirects to tenant-not-found**: check both halves of
  "Onboarding a new domain" above — a router in Traefik with no matching
  `tenant_domains` row (or vice versa) is the usual cause.
- **Edited `routers.yml.template` but nothing changed**: you likely edited
  the wrong file — Traefik reads the rendered `routers.yml`, produced by
  `entrypoint.sh` from the `.template` file **once, on container start**.
  Either restart the `traefik` container, or edit `routers.yml` directly for
  a one-off change you don't intend to keep (it gets overwritten on the next
  restart from the template, so always fold real changes back into the
  `.template` file).
