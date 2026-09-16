# Deployment

The production deployment target is **one server running Docker Compose** —
no Kubernetes, no orchestrator, no separate hosts per tenant. 7 tenants of
CMS content don't need more than that (see `docs/ARCHITECTURE.md`). This
covers first-time setup, ongoing deploys, backups, and what to check when
something's wrong.

## 1. Prerequisites

- One server (VM or bare metal) with a public IP, Docker + Docker Compose
  v2 installed. Sizing: this is a CMS for 7 low-traffic corporate sites, not
  a high-throughput app — a small VM (2 vCPU / 4GB RAM) is a reasonable
  starting point; scale up only if you actually see load, not preemptively.
- DNS control for all 7 tenant domains (`holdingshydro.com`,
  `ichchhakamanacablecar.com`, `nepallandbroker.com`, `prabhucablecar.com`,
  `holdingsprabhu.com`, `prabhusteel.com`, `ranimahalcablecar.com`, per
  `backend/app/db/seed.py`) plus one you'll dedicate to the Super Admin
  console (not one of the 7 above — see `docs/TRAEFIK.md`).
- Ports `80` and `443` open to the internet on that server (ACME's HTTP-01
  challenge needs `80`; see `docs/TRAEFIK.md`'s troubleshooting section if
  certs won't issue).

This platform was built and tested on a machine **without Docker
available** — every piece was verified by running the real processes
directly (`uvicorn`, `next dev`) against an isolated MySQL instance, not
inside containers. The Dockerfiles and Compose topology are real,
production-shaped deliverables, but have not themselves been exercised with
an actual `docker compose up` in this environment. Do a full
`docker compose up -d --build` on a staging box before pointing real DNS at
it, and treat that as the first real integration test of the container
build itself.

## 2. First deployment

```bash
git clone <this-repo> /opt/prabhu-platform
cd /opt/prabhu-platform/infra
cp .env.example .env
```

Fill in `infra/.env`:

| Variable | What it is |
|---|---|
| `ACME_EMAIL` | Real address — Let's Encrypt sends expiry/problem notices here. |
| `SUPER_ADMIN_DOMAIN` | The operator-only domain from the prerequisites above. |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` / `DB_ROOT_PASSWORD` | Generate real passwords (`openssl rand -hex 24`), don't reuse the placeholders. |
| `JWT_SECRET` | `openssl rand -hex 32`. Rotating this later invalidates every session instantly. |
| `SEED_SUPER_ADMIN_USERNAME` / `_EMAIL` / `_PASSWORD` | The one initial Super Admin account, created on first boot only (see below). |

Then:

```bash
docker compose up -d --build
```

On first start, the `backend` container runs `alembic upgrade head` (creates
the schema) and `python -m app.db.seed` (idempotent — seeds the 7 known
tenants + Nepal locations reference data + the one Super Admin account from
`SEED_*` above) before starting `uvicorn`. Both are safe to run again on
every subsequent restart; `seed.py` no-ops once tenants/locations/a
super_admin already exist.

Once DNS for all domains points at the server and Traefik has had a minute
to obtain certificates (check `docker compose logs traefik`), every tenant
domain and the Super Admin domain should be reachable over HTTPS.

**After first boot**, unset or blank out `SEED_SUPER_ADMIN_PASSWORD` in
`infra/.env` (it's only read once — while no super_admin row exists yet —
but there's no reason to leave a plaintext password sitting in an env file
longer than necessary).

## 3. Ongoing deploys

```bash
cd /opt/prabhu-platform
git pull
cd infra
docker compose up -d --build
```

This rebuilds and restarts `backend` and `frontend` (Traefik and `mysql`
are unaffected unless their own config/image changed). The backend
container re-runs `alembic upgrade head` on every start, so a new migration
merged to `main` is applied automatically on the next deploy — no separate
manual migration step.

There is brief downtime during a redeploy (the old container stops before
the new one is healthy) — acceptable for a set of low-traffic corporate
sites; if that ever stops being true, the next step is Compose's
`--no-deps` + a second replica behind Traefik before reaching for anything
heavier.

## 4. CI/CD (`.github/workflows/ci.yml`)

- **`backend` / `frontend` jobs** (every PR and push to `main`): install
  deps, run migrations + `pytest` against a real MySQL 8.0 service
  container, `bandit` + `pip-audit` for the backend, `tsc --noEmit` +
  `eslint` + `npm audit` + a production `next build` for the frontend.
- **`build-images`** (on `main` only): builds both Docker images to confirm
  the Dockerfiles work, tagged with the commit SHA. It does not currently
  push them to a registry — the `deploy` job below rebuilds from source
  directly on the target server instead, which is simpler for a
  single-server target and was the practical choice here. Wiring this job
  to push to a registry (GHCR, ECR, etc.) and having `deploy` pull a
  pre-built image is a reasonable next step if deploys need to get faster
  or you move to multiple servers — it's not required for this to work.
- **`deploy`** (on `main` only, gated by a GitHub **environment** named
  `production`): SSHes into `DEPLOY_HOST` as `DEPLOY_USER` (repo secrets)
  and runs the same `git pull && docker compose up -d --build` as a manual
  deploy. Configure the `production` environment's required reviewers in
  the repo's Settings → Environments so this step needs explicit approval
  before it runs — it's set up to require that, but the approver list isn't
  something this repo can configure for you.

Required repo secrets for the `deploy` job: `DEPLOY_HOST`, `DEPLOY_USER`,
`DEPLOY_SSH_KEY` (a private key whose public half is authorized on the
server for `DEPLOY_USER`).

## 5. Backups

Two named volumes hold everything that isn't in git:

- `mysql_data` — the database.
- `uploads_data` — every uploaded image/document, at
  `uploads/<tenant_slug>/<module>/...`.

```bash
# Database dump
docker compose exec mysql mysqldump -u root -p"$DB_ROOT_PASSWORD" "$DB_NAME" > backup-$(date +%F).sql

# Uploads (from the host, via the named volume's mountpoint)
docker run --rm -v prabhu-platform_uploads_data:/data -v "$PWD":/backup \
  alpine tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
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

- `GET /health` on the backend (internal-only, not routed by Traefik —
  check it via `docker compose exec backend curl localhost:8000/health` or
  by adding it as a Compose healthcheck if you want automatic restarts).
- Traefik's own dashboard is enabled (`api.dashboard: true` in
  `infra/traefik/traefik.yml`) but not exposed via a public router — reach
  it from the server itself (`docker compose exec traefik wget -qO- localhost:8080/api/rawdata`)
  or add a router for it restricted to your own IP if you want browser
  access.
- No metrics/APM stack is wired up. Not adding one was a deliberate choice
  for the same reason the whole platform avoids Redis/queues/Kubernetes —
  add one if and when actual operational need shows up, not preemptively.
