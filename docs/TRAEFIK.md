# Traefik

How routing, TLS, and domain onboarding work. Config lives in
`infra/traefik/`; every environment-specific value comes from `infra/.env`.

## Routing model

```
https://<slug>.BASE_DOMAIN/...        -> frontend   (tenant resolved from Host)
https://SUPER_ADMIN_DOMAIN/...        -> frontend   (operator console, tighter rate limit)
https://<CUSTOM_DOMAINS entry>/...    -> frontend   (optional tenant-owned domains)
https://<any routed host>/media/...   -> backend    (FastAPI static files)
http://...                            -> 301 to https
```

With `BASE_DOMAIN=example.com`, `a.example.com` and `b.example.com` hit the
**same** Next.js container; `frontend/src/proxy.ts` sends the Host to
`GET /internal/tenants/by-domain/{host}`, which resolves it in this order
(`backend/app/modules/tenants/router.py`):

1. An explicit `tenant_domains` row for that hostname (managed in the Super
   Admin console) — lets `steel.example.com` or `prabhusteel.com` map to
   any tenant.
2. Otherwise `<slug>.TENANT_BASE_DOMAIN` → the active tenant with that
   slug (`TENANT_BASE_DOMAIN` is set from `BASE_DOMAIN` by Compose).
3. Otherwise the visitor is redirected to `/tenant-not-found`.

So adding a tenant needs no Traefik change: create it in the console and
`https://<slug>.example.com` works (with a wildcard cert, see below).

Other rules, all in the rendered router config:

- `/super-admin` is only routed on `SUPER_ADMIN_DOMAIN`. On any other host
  it is redirected there — the console never renders on a tenant domain.
- `https://SUPER_ADMIN_DOMAIN/` redirects to `/super-admin`.
- The bare `BASE_DOMAIN` and deeper names (`x.y.example.com`) are not
  routed (Traefik 404).
- FastAPI is reachable from outside only for `/media/*`; everything else
  goes Next.js → backend over the docker network.

## Files

```
infra/traefik/
  entrypoint.sh          renders the full config from env, then execs traefik
  traefik.yml            static base: entrypoints, trusted proxy IPs, logs
  dynamic/
    middlewares.yml      shared edge middlewares (headers, rate limits, ...)
```

Traefik ignores CLI flags whenever a config file is used, and never
interpolates env vars inside its config files — so `entrypoint.sh` writes
the effective config inside the container at every start:

- `/etc/traefik/traefik.yml` = `traefik.yml` + the ACME resolvers for the
  chosen `TLS_CHALLENGE`.
- `/etc/traefik/dynamic/routers.yml` = routers and services built from
  `BASE_DOMAIN`, `SUPER_ADMIN_DOMAIN`, `CUSTOM_DOMAINS`, `TENANT_SUBDOMAINS`.

It validates every hostname (DNS characters only) and required setting, and
exits with a clear message instead of starting with a broken config. Inspect
the result with `docker compose exec traefik cat /etc/traefik/dynamic/routers.yml`.
Config changes apply on `docker compose up -d` (Traefik is recreated when
its env changes) or `docker compose restart traefik` (after editing files).

No Docker-socket / label-based discovery is used: Traefik never needs
`docker.sock` mounted, so it can't enumerate or control other containers.

## TLS (`TLS_CHALLENGE`)

| Mode | Certificates | Needs |
|---|---|---|
| `dns` (default) | One wildcard `BASE_DOMAIN` + `*.BASE_DOMAIN` cert via ACME DNS-01 | `ACME_DNS_PROVIDER` + that provider's API credentials (`CF_DNS_API_TOKEN` for Cloudflare) |
| `http` | One cert per hostname via HTTP-01 (wildcards are impossible over HTTP-01) | Every tenant subdomain listed in `TENANT_SUBDOMAINS` |
| `selfsigned` | Traefik's default self-signed cert | Nothing — local/staging testing only |

`SUPER_ADMIN_DOMAIN` shares the wildcard cert when it's a direct subdomain
of `BASE_DOMAIN`; it and `CUSTOM_DOMAINS` otherwise use HTTP-01. Both ACME
resolvers keep their state in the `traefik_acme` volume. Set
`ACME_CA_SERVER` to Let's Encrypt staging while testing.

For a DNS provider other than Cloudflare, set `ACME_DNS_PROVIDER` to its
[lego provider name](https://doc.traefik.io/traefik/https/acme/#providers)
and add its credential variables to the `traefik` service's `environment`
in `docker-compose.yml` and to `infra/.env`.

## Onboarding a tenant or domain

- **New tenant on a subdomain**: create it in the Super Admin console.
  `https://<slug>.BASE_DOMAIN` works immediately under `TLS_CHALLENGE=dns`.
  Under `http`, also add the slug to `TENANT_SUBDOMAINS` and
  `docker compose up -d`.
- **A subdomain that isn't the slug** (`steel.example.com` → `prabhusteels`):
  add the hostname under the tenant's Domains in the console. Nothing else.
- **A tenant's own domain** (`prabhusteel.com`): add it under the tenant's
  Domains in the console **and** to `CUSTOM_DOMAINS` in `infra/.env`, point
  its DNS at the server, then `docker compose up -d`.

## The Super Admin domain

`SUPER_ADMIN_DOMAIN` (e.g. `admin.example.com`) is an operator-only host
that also routes to `frontend`. Don't create a tenant whose slug equals its
first label (e.g. `admin`) — the console router wins over the tenant one.
`frontend/src/proxy.ts` skips tenant resolution for `/admin/*` and
`/super-admin/*`, so the console host never hits `/tenant-not-found`.
Tenant admins sign in on their own tenant host (`/admin/login`).

## Rate limiting & headers

Every public router chains four middlewares, defined once in
`infra/traefik/dynamic/middlewares.yml`:

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

Tune the numbers in `middlewares.yml` (then restart Traefik) if
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

Behind Traefik, the backend sees two kinds of callers, and treats them
differently (`BEHIND_PROXY=true`, set in `docker-compose.yml`):

- **Requests carrying `X-Forwarded-For`** — `/media/*` straight from
  Traefik, and the Next.js server's *uncached* calls (login, form submits,
  admin CMS), which re-send the visitor's IP (`frontend/src/lib/api.ts:clientIpHeaders`).
  uvicorn's `--proxy-headers` makes that IP `request.client.host`, so the
  per-IP limiter and the login lockout apply per visitor.
- **Requests without it** — Next.js server-side rendering for many visitors
  at once from one container IP. These skip the backend's per-IP limiter
  (counting them would throttle the whole site); the Traefik edge limits
  above already apply per visitor.

## Local development

- **Without Docker** (`docs/RUNBOOK.md`): no Traefik. With
  `TENANT_BASE_DOMAIN=localhost` in `backend/.env`, open
  `http://<slug>.localhost:3000` — `*.localhost` resolves to 127.0.0.1.
- **Full stack in Docker**: `BASE_DOMAIN=localhost`,
  `SUPER_ADMIN_DOMAIN=admin.localhost`, `TLS_CHALLENGE=selfsigned` in
  `infra/.env`, then `https://<slug>.localhost` (see `docs/RUNBOOK.md`).

## Troubleshooting

- **Traefik container exits immediately**: `docker compose logs traefik` —
  `entrypoint.sh` prints which `.env` value is missing or invalid.
- **Wildcard certificate not issuing** (`dns`): check the logs for lego
  errors. Usually the API token lacks *DNS:Edit* on the zone, or the
  provider needs different credential variables.
- **Certificate not issuing** (`http` / custom domains): port `80` must be
  reachable from the internet for that hostname, and its DNS must already
  point at the server.
- **A subdomain redirects to `/tenant-not-found`**: no active tenant has
  that slug and no `tenant_domains` row matches the hostname. Check the
  tenant's slug and `is_active` in the console, and that `BASE_DOMAIN` in
  `infra/.env` is the domain being requested.
- **404 from Traefik**: the host isn't routed — the bare base domain, a
  name deeper than one label, or a custom domain missing from
  `CUSTOM_DOMAINS`.
