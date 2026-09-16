# Security

What's in place against the OWASP Top 10 and DDoS, where it lives, and the
two operator-side steps (Cloudflare, fail2ban) that aren't code — they're
account/host configuration this repo can document but not perform for you.

## OWASP Top 10 (2021) — where each one is handled

| # | Risk | Where |
|---|---|---|
| A01 | Broken Access Control | `backend/app/core/deps.py`: `get_tenant_scope` derives tenant scope from the JWT only, never a client-supplied header, for `tenant_admin`. `require_super_admin` gates cross-tenant routes. Covered by `backend/tests/test_tenant_isolation.py`. |
| A02 | Cryptographic Failures | bcrypt password hashing (`backend/app/core/security.py`), JWT signed with `JWT_SECRET`. `config.py:validate_production_config` refuses to boot with `ENVIRONMENT=production` if `JWT_SECRET`/`DB_PASSWORD` are still the insecure placeholder defaults. TLS terminated at Traefik via Let's Encrypt (`infra/traefik/traefik.yml`). |
| A03 | Injection | SQLAlchemy ORM everywhere, no raw/string-built SQL. File uploads are content-type-allowlisted and images are re-encoded through Pillow (`backend/app/modules/media/service.py`), not stored as-uploaded. |
| A04 | Insecure Design | Edge rate limiting + in-flight connection caps + body-size caps (`infra/traefik/dynamic/routers.yml.template`), a second app-level login-specific throttle (`backend/app/core/rate_limit.py:LoginRateLimiter`) on top of the general one, no CORS surface at all (`backend/app/main.py`'s comment explains why). |
| A05 | Security Misconfiguration | HSTS/CSP/X-Content-Type-Options/X-Frame-Options/Referrer-Policy/Permissions-Policy set at both the Traefik edge and in `frontend/next.config.ts` (belt-and-suspenders — the latter also covers local dev). No Docker-socket exposure to Traefik (`docs/TRAEFIK.md`). Traefik dashboard is enabled but not publicly routed. |
| A06 | Vulnerable & Outdated Components | CI runs `bandit` + `pip-audit` + `npm audit --audit-level=high` on every PR (`.github/workflows/ci.yml`). `.github/dependabot.yml` opens weekly update PRs for pip, npm, both Dockerfiles, and GitHub Actions so vulnerable pins don't just sit there between CI runs. |
| A07 | Identification & Authentication Failures | bcrypt, JWT expiry (`JWT_EXPIRES_MINUTES`), httpOnly/secure/SameSite=Lax session cookie (`frontend/src/lib/session.ts` — the JWT itself is never readable from browser JS). `LoginRateLimiter` throttles repeated failed logins per (IP, username) and logs them (`backend/app/modules/auth/router.py`). |
| A08 | Software & Data Integrity Failures | CI builds and tests every PR before merge; `deploy` requires a GitHub Environment approval gate (`docs/DEPLOYMENT.md`). Dependabot (A06) covers supply-chain drift. |
| A09 | Security Logging & Monitoring Failures | Failed logins are logged (`app.auth` logger). Traefik's JSON access log (`accessLog` in `traefik.yml`) is what fail2ban (below) reads. No metrics/APM stack — deliberately, per `docs/DEPLOYMENT.md`'s existing "add it when there's a real operational need" stance; this is intentionally the minimum signal needed to act, not a full observability platform. |
| A10 | Server-Side Request Forgery | No feature accepts an arbitrary URL for the server to fetch. `frontend/src/proxy.ts` calls one fixed internal endpoint (`/internal/tenants/by-domain/{host}`) — `host` is a path segment matched against known tenant domains, not a URL the server dereferences. |

## DDoS

Two layers, per the deliberate choice to run both rather than either alone:

### 1. Network/volumetric layer — Cloudflare

Traefik-level rate limiting (below) only stops abuse from connections that
already reached the VM. A real volumetric flood saturates the network link
before Traefik ever sees a request — that has to be stopped upstream.

Setup (done in Cloudflare's dashboard + your DNS registrar, not in this repo):

1. Add each of the 7 tenant domains + the Super Admin domain to a Cloudflare
   account (free plan is enough to start).
2. Point their DNS records at the server's IP with the proxy status
   **"Proxied"** (orange cloud) — not "DNS only" (grey cloud). Grey-cloud
   exposes the origin IP directly, defeating the whole point.
3. SSL/TLS mode: **Full (strict)** — Cloudflare already terminates TLS at
   its edge with your domains' certs; "Full (strict)" also verifies
   Traefik's own Let's Encrypt cert on the origin connection rather than
   accepting anything.
4. Under **Security → WAF → Rate limiting rules**, add a rule for
   `/admin/login` and `/super-admin/login` (or wherever the login form
   posts) tighter than the general site — e.g. 10 requests/minute per IP.
5. **"Under Attack Mode"** (Security → Settings) is available as a lever
   during an active attack — it adds a JS challenge in front of every
   request. Don't leave it on permanently (it affects every visitor,
   including search crawlers), but know it's there.
6. `infra/traefik/traefik.yml`'s `entryPoints.*.forwardedHeaders.trustedIPs`
   is already pre-populated with Cloudflare's published IP ranges, so once
   DNS is proxied, Traefik (and everything downstream — the rate-limit
   middlewares, the backend's login throttle, access logs) sees each
   visitor's real IP instead of Cloudflare's, via `X-Forwarded-For`. No
   further config needed for that part.
7. Keep the origin server's firewall from accepting direct connections that
   bypass Cloudflare where possible (e.g., a provider-level "allow 80/443
   only from Cloudflare's IP ranges" firewall rule) — otherwise an attacker
   who finds the origin IP (e.g., from DNS history predating the Cloudflare
   switch) can hit it directly and skip Cloudflare entirely.

### 2. Application/host layer — Traefik + fail2ban

Defense in depth if Cloudflare is ever bypassed, misconfigured, or simply
not yet set up. Traefik's part (rate limiting, in-flight caps, body-size
caps, security headers) is already wired up — see `docs/TRAEFIK.md`'s "Rate
limiting & headers" section for what each middleware does.

The remaining piece is host-level: ban repeat offenders (failed logins,
requests already throttled to 429) at the firewall so they stop consuming
even a rate-limited connection slot. This repo has no host-provisioning
script (matches its existing "one small VM, no orchestration" stance), so
this is a snippet to install by hand on the deploy target, reading the JSON
access log at `infra/traefik-logs/access.log` (bind-mounted from the
`traefik` container — see `infra/docker-compose.yml`):

```ini
# /etc/fail2ban/filter.d/traefik-auth.conf
[Definition]
failregex = ^.*"ClientHost":"<HOST>".*"DownstreamStatus":(401|429).*$
ignoreregex =
```

```ini
# /etc/fail2ban/jail.d/traefik-auth.conf
[traefik-auth]
enabled  = true
filter   = traefik-auth
logpath  = /opt/prabhu-platform/infra/traefik-logs/access.log
maxretry = 10
findtime = 600
bantime  = 3600
action   = iptables-allports
```

Install: `apt install fail2ban`, drop both files in, `systemctl restart fail2ban`,
then `fail2ban-client status traefik-auth` to confirm the jail is active.

## Verifying after deploy

```bash
# Headers present on a real response
curl -sI https://prabhusteel.com/ | grep -iE "strict-transport|content-security|x-frame|x-content-type|referrer-policy|permissions-policy"

# Rate limiting: expect a run of 200s then 429s
for i in $(seq 1 80); do curl -s -o /dev/null -w "%{http_code}\n" https://prabhusteel.com/; done

# Login throttle: expect 401s then a 429 after the configured attempt budget
for i in $(seq 1 8); do curl -s -o /dev/null -w "%{http_code}\n" -X POST https://<super-admin-domain>/admin/login -d 'username=x&password=wrong'; done
```

Also worth an occasional pass through
[securityheaders.com](https://securityheaders.com) and
[Mozilla Observatory](https://developer.mozilla.org/en-US/observatory) for a
second opinion on the header policy once a domain is live.
