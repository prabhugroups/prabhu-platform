# Deployment

The production deployment target is **one server running Docker Compose** —
no Kubernetes, no orchestrator, no separate hosts per tenant. 7 tenants of
CMS content don't need more than that (see `docs/ARCHITECTURE.md`). This
covers first-time setup, ongoing deploys, backups, and what to check when
something's wrong.

## 1. Prerequisites

- One server (VM or bare metal) with a public IP, Docker Engine + Compose
  v2. A small VM (2 vCPU / 4GB RAM) is a reasonable start for this CMS.
- A base domain you control (called `example.com` below). Every tenant is
  served at `https://<tenant-slug>.example.com`, all from the same
  containers — the tenant is resolved from the request's Host header.
- DNS records pointing at the server:
  - `*.example.com` (wildcard A/AAAA) — every tenant, present and future.
  - The Super Admin host, e.g. `admin.example.com` (already covered by the
    wildcard if it's a direct subdomain).
  - Any tenant custom domains you list in `CUSTOM_DOMAINS` (optional).
- Ports `80` and `443` open to the internet (`80` serves the HTTP→HTTPS
  redirect and HTTP-01 challenges).
- For wildcard TLS (`TLS_CHALLENGE=dns`, recommended): an API token for the
  domain's DNS provider. For Cloudflare: *Zone → Zone → Read* and
  *Zone → DNS → Edit* on the base domain's zone.

## 2. First deployment

The server needs no clone of this repo and no files copied by hand — the
CI deploy job uploads `docker-compose.yml` and `traefik/` on every deploy.
The one file you create yourself is `infra/.env`, because it holds the
secrets (start from `infra/.env.example` in the repo):

```bash
# on the server
mkdir -p /opt/prabhu-platform/infra && cd /opt/prabhu-platform/infra
nano .env          # paste .env.example's contents, fill in real values
chmod 600 .env
```

`infra/.env` is the **single source of configuration** for the Docker stack
— Compose passes it to each container, and Traefik's routing/TLS config is
rendered from it at start (`infra/traefik/entrypoint.sh`). Required values
fail fast: `docker compose up` refuses to start with a clear message if one
is missing, Traefik refuses an invalid hostname, and the API refuses the
`change-me` placeholder secrets.

| Variable | What it is |
|---|---|
| `BASE_DOMAIN` | Tenants are served at `<slug>.BASE_DOMAIN`. |
| `SUPER_ADMIN_DOMAIN` | Operator console host, e.g. `admin.example.com`, or `BASE_DOMAIN` itself to serve the console on the bare domain. `/super-admin` is only routed here. |
| `CUSTOM_DOMAINS` | Optional comma-separated extra hostnames (a tenant's own domain). Each also needs a `tenant_domains` row. |
| `TLS_CHALLENGE` | `dns` (one wildcard cert, recommended), `http` (per-host certs; requires `TENANT_SUBDOMAINS`), `external` (a reverse proxy already on the server owns 80/443 — see `docs/TRAEFIK.md`, "Behind an existing reverse proxy"), or `selfsigned` (testing only). |
| `TRAEFIK_HTTP_BIND` / `TRAEFIK_HTTPS_BIND` | Host ports Traefik publishes: `80`/`443` by default; `127.0.0.1:8880`/`127.0.0.1:8843` with `TLS_CHALLENGE=external`. |
| `ACME_EMAIL` | Real address — Let's Encrypt sends expiry/problem notices here. |
| `ACME_DNS_PROVIDER` / `CF_DNS_API_TOKEN` | DNS-01 provider + credentials (for `TLS_CHALLENGE=dns`). |
| `TENANT_SUBDOMAINS` | Only for `TLS_CHALLENGE=http`: every tenant subdomain to issue a cert for. |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` / `DB_ROOT_PASSWORD` | Generate real passwords (`openssl rand -hex 24`). |
| `JWT_SECRET` | `openssl rand -hex 32`. Rotating it later invalidates every session instantly. |
| `SEED_SUPER_ADMIN_USERNAME` / `_EMAIL` / `_PASSWORD` | The initial Super Admin, created on first deploy only. |
| `IMAGE_TAG` | Release to run (a git commit SHA). Written by the CI deploy job; edit by hand only to roll back. |

Tip: set `ACME_CA_SERVER` to Let's Encrypt staging for the first run so a
DNS/token mistake can't burn production rate limits; once certificates
issue, remove it and reset the staging certs:
`docker compose rm -sf traefik && docker volume rm prabhu-platform_traefik_acme && docker compose up -d`.

Then pull the images CI published to GHCR and start everything (the first
time, before CI has deployed, `IMAGE_TAG=latest` is fine):

```bash
docker login ghcr.io -u <github-user>   # only if the packages are private; a PAT with read:packages
docker compose pull
docker compose up -d --wait
```

Startup order is enforced by healthchecks: `mysql` → `migrate` (one-shot:
`alembic upgrade head` + the idempotent `python -m app.db.seed`, which seeds
the `SEED_TENANTS` preset if set, Nepal locations and the Super Admin) → `backend` →
`frontend` → `traefik`. If a migration fails, `migrate` exits non-zero and
the API never starts on a half-migrated schema.

Once DNS resolves and Traefik has obtained certificates (watch
`docker compose logs -f traefik`), check:

```bash
curl -I https://prabhusteels.example.com/     # 200 — Prabhu Steels
curl -I https://hydro-holdings.example.com/   # 200 — Hydro Holdings
curl -I https://nope.example.com/             # 307 -> /tenant-not-found
curl -I https://admin.example.com/            # 302 -> /super-admin
```

The subdomain is the tenant's **slug** (`backend/app/db/seed.py`). To serve
a tenant at a different name (e.g. `steel.example.com`), add that hostname
as a domain for the tenant in the Super Admin console — explicit domain
rows win over the slug convention, and no infra change is needed.

**After first boot**, blank out `SEED_SUPER_ADMIN_PASSWORD` in
`infra/.env` (it's only read while no super_admin row exists).

## 3. Ongoing deploys

Every push to `main` deploys itself once CI is configured (section 4):

```
push to main → tests → build both images → push to GHCR (:<sha>, :latest)
            → copy infra/ (compose + traefik) to server → docker compose pull
            → IMAGE_TAG=<sha> written to infra/.env → docker compose up -d --wait
```

The server never builds anything and holds no git clone — only Docker,
the `infra/` files CI copies there on every deploy, and its own
`infra/.env`, which CI never overwrites (it only rewrites the `IMAGE_TAG`
line). The `migrate` service applies new Alembic
migrations before the new API starts. There is a brief blip while
containers are swapped.

Manual deploy of a specific release (same thing CI does):

```bash
cd /opt/prabhu-platform/infra
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=<sha>/' .env
docker compose pull && docker compose up -d --wait
```

### Rolling back

Every deploy appends `<time> <sha> (previous: <sha>)` to
`infra/.deploy-history` on the server. To roll back, set `IMAGE_TAG` in
`infra/.env` to an earlier SHA and run `docker compose pull && docker
compose up -d --wait`. Images stay in GHCR, so any past release can be
pulled again. **Database migrations are not rolled back** — if the release
you're leaving added a migration, check it's backwards-compatible first
(see `docs/ROLLBACK.md`).

## 4. CI/CD (`.github/workflows/ci.yml`)

- **`backend` / `frontend`** (every PR and push to `main`): migrations +
  `pytest` against MySQL 8.0, `bandit` + `pip-audit`; `tsc` + `eslint` +
  `npm audit` + a production `next build`.
- **`publish-images`** (`main` only): builds the backend and frontend images
  (linux/amd64, layer-cached between runs) and pushes them to
  `ghcr.io/<owner>/prabhu-platform-{backend,frontend}` tagged with the commit
  SHA and `latest`. Uses the workflow's own `GITHUB_TOKEN` — no secret to set.
- **`deploy`** (`main` only, after a successful publish): deploys to every
  company listed in the `DEPLOY_TARGETS` repository variable (skipped while
  it's unset), each in parallel and independently — one company's failure
  never cancels another's. Runs the steps in section 3 over SSH, logging in
  to GHCR with the job's short-lived token. *Actions → CI → Run workflow*
  re-runs it, optionally for a single company (`target` input).

### Multiple companies, one repo

Every company running this platform gets its **own server, domains,
tenants and secrets**, and shares the code and images:

| Lives in | Per company | Shared |
|---|---|---|
| GitHub Environment named after the company | server address, SSH key, approval rules | — |
| That server's `infra/.env` | domains, TLS, DB/JWT secrets, `SEED_TENANTS`, super admin | — |
| That server's database | tenants, admins, content | — |
| Repo + GHCR | — | code, images, compose/Traefik config |

### One-time setup (repository)

Settings → Secrets and variables → Actions → **Variables** tab:

| Variable | Value |
|---|---|
| `DEPLOY_TARGETS` | JSON array of environments that every push to `main` deploys, e.g. `["prabhu"]`, later `["prabhu","acme"]`. Unset = no deploys. |

If the organization restricts package publishing, allow it under the org's
Settings → Packages, and make sure Settings → Actions → General → Workflow
permissions doesn't cap `GITHUB_TOKEN` below what the jobs ask for.

### Adding a company (repeat per company)

**1. CI key.** On your own machine, a keypair used only by CI for this
company's server:

```bash
ssh-keygen -t ed25519 -C "ci-deploy-<company>" -f deploy_<company> -N ""
```

The private half (`deploy_<company>`) goes into GitHub (step 3); the
public half (`deploy_<company>.pub`) goes onto the server (step 2).

**2. Server.** Copy `infra/server/setup-deploy-user.sh` to the server and
run it as root with the public key:

```bash
scp infra/server/setup-deploy-user.sh deploy_<company>.pub root@<server-ip>:/root/
ssh root@<server-ip> 'bash /root/setup-deploy-user.sh "$(cat /root/deploy_<company>.pub)"'
```

It is idempotent (safe to re-run) and installs Docker if missing, creates
the `deploy` user (key-only login, no password, no sudo, in the `docker`
group), authorizes the key with forwarding disabled, creates
`/opt/prabhu-platform/infra` owned by `deploy`, opens 80/443 if `ufw` is
active, runs checks, and prints the host-key fingerprint for step 3. It
never edits `sshd_config` or creates secrets. Then create the company's
`.env` as that user (section 2) and lock it down:

```bash
sudo -u deploy nano /opt/prabhu-platform/infra/.env
sudo chmod 600 /opt/prabhu-platform/infra/.env
```

Check from your machine that the key works:
`ssh -i deploy_<company> deploy@<server-ip> 'docker ps && ls -la /opt/prabhu-platform/infra'`.

**3. GitHub Environment.** Settings → Environments → New environment, named
after the company (lowercase, e.g. `prabhu`). Optionally add required
reviewers / restrict to the `main` branch. Then, in that environment:

| Kind | Name | Value |
|---|---|---|
| Variable | `DEPLOY_HOST` | Server IP or hostname |
| Variable | `DEPLOY_USER` | `deploy` |
| Variable | `DEPLOY_PORT` | Optional, default `22` |
| Variable | `DEPLOY_PATH` | Optional, default `/opt/prabhu-platform` |
| Secret | `DEPLOY_SSH_KEY` | Contents of the private key `deploy_<company>` |
| Secret | `DEPLOY_SSH_FINGERPRINT` | The `SHA256:...` fingerprint printed at the end of step 2 (see note below) |

The fingerprint must be of the host key the CI SSH client negotiates, which
prefers **ECDSA** over RSA over ED25519 — not necessarily the key `ssh`
shows you. The setup script prints the right one; to check from anywhere:
`ssh-keyscan -t ecdsa <server-ip> | ssh-keygen -lf -`. The wrong key type
fails the deploy with `ssh: host key fingerprint mismatch`.

**4. Go live.** Add the environment's name to `DEPLOY_TARGETS`, then
*Actions → CI → Run workflow* with `target` = the company. The first deploy
uploads the infra files, pulls the images, migrates, seeds and starts the
stack; after that every push to `main` deploys it.

## 5. Backups

Two named volumes hold everything that isn't in git:

- `mysql_data` — the database.
- `uploads_data` — every uploaded image/document, at
  `uploads/<tenant_slug>/<module>/...`.

```bash
# Database dump
docker compose exec mysql mysqldump -u root -p"$DB_ROOT_PASSWORD" "$DB_NAME" > backup-$(date +%F).sql

# Uploads
docker compose exec -T backend tar czf - -C /app/uploads . > uploads-$(date +%F).tar.gz
```

Automate both on a cron schedule and ship the results off-server (this repo
doesn't prescribe a specific destination — S3, another host, whatever your
existing backup story already covers). Restoring is the reverse: load the
SQL dump into a fresh `mysql_data` volume, untar the archive into a fresh
`uploads_data` volume.

## 6. Per-tenant cutover

The 7 tenant domains don't need to go live simultaneously. See
`docs/ROLLBACK.md` for the full per-tenant cutover/rollback sequence and
`migration/README.md` for migrating a legacy tenant's data before flipping
its domain over — both are written around this platform already being
deployed and reachable, with tenants brought onto it one at a time behind
Traefik router changes rather than a single all-at-once switch.

## 7. Health checks / monitoring

- Every service has a Docker healthcheck (`docker compose ps` shows
  health); Traefik only starts once `frontend` and `backend` are healthy.
  The backend's `GET /health` is internal-only — from the server:
  `docker compose exec backend python -c "import urllib.request;print(urllib.request.urlopen('http://127.0.0.1:8000/health').read())"`.
- Container logs are rotated by Docker (`json-file`, 5 × 10MB per
  container). Traefik's JSON access log (`infra/traefik-logs/access.log`,
  for fail2ban) is not — add a host `logrotate` rule for it.
- The Traefik dashboard/API is disabled; `docker compose exec traefik cat
  /etc/traefik/dynamic/routers.yml` shows the rendered routing.
- No metrics/APM stack is wired up. Not adding one was a deliberate choice
  for the same reason the whole platform avoids Redis/queues/Kubernetes —
  add one if and when actual operational need shows up, not preemptively.
