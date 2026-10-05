# Runbook

Local development quick-start. For the full production deployment plan
(server setup, secrets, CI/CD, backups), see [`DEPLOYMENT.md`](DEPLOYMENT.md).
For how the CMS itself works and is configured, see [`CMS.md`](CMS.md). For
Traefik routing details, see [`TRAEFIK.md`](TRAEFIK.md).

## Local development (no Docker required)

The platform was built and verified on a machine without Docker installed —
everything below runs the real processes directly, which is also the
fastest inner loop for development regardless.

### 1. Backend

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

# Point at any MySQL 8.0 instance you control (see "throwaway MySQL" below
# if you don't have one handy). Copy .env from the example and edit:
cp .env.example .env   # DB_HOST/PORT/NAME/USER/PASSWORD, JWT_SECRET

.venv/bin/alembic upgrade head
SEED_SUPER_ADMIN_PASSWORD='change-me' .venv/bin/python -m app.db.seed
.venv/bin/uvicorn app.main:app --reload --port 8000
```

`app.db.seed` only creates the `SEED_TENANTS` preset's tenant rows (`prabhu`
in `backend/.env.example` = the 7 Prabhu sites) + locations + super admin —
every tenant's public site is blank until real content is entered through
the CMS. For a quick local demo (or to give another dev something to look
at immediately), seed one tenant's public-site content from a small,
curated real-world fixture:

```bash
.venv/bin/python -m app.db.seed_demo_content                    # seeds prabhu-holdings
.venv/bin/python -m app.db.seed_demo_content --tenant prabhusteels  # or any other tenant slug
```

Idempotent — skips with a message if that tenant already has content.
See `backend/app/db/seed_demo_content.py` for what it seeds (banners,
about text, stakeholders, associates, spokesperson, contact info,
portfolios, team, a handful of documents, one gallery album — trimmed
down from the real site's full content to keep the fixture small).

#### Throwaway MySQL (if you don't want to touch a shared instance)

```bash
mkdir -p /tmp/prabhu-mysql/data
mysqld --no-defaults --initialize-insecure --datadir=/tmp/prabhu-mysql/data
mysqld --no-defaults --datadir=/tmp/prabhu-mysql/data \
  --socket=/tmp/prabhu-mysql.sock --port=3307 --bind-address=127.0.0.1 --mysqlx=0 &
mysql --socket=/tmp/prabhu-mysql.sock -u root -e "
  CREATE DATABASE prabhu_platform CHARACTER SET utf8mb4;
  CREATE USER 'prabhu_platform'@'%' IDENTIFIED BY 'devpassword';
  GRANT ALL PRIVILEGES ON prabhu_platform.* TO 'prabhu_platform'@'%';"
```
Then `DB_HOST=127.0.0.1`, `DB_PORT=3307`, `DB_USER=prabhu_platform`,
`DB_PASSWORD=devpassword` in `backend/.env`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # INTERNAL_API_URL=http://127.0.0.1:8000
npm run dev
```

### 3. Exercise a real tenant locally

The frontend resolves tenants by Host header, so either:

- add entries to `/etc/hosts` pointing the 7 real domains at `127.0.0.1`, or
- send a `Host:` header directly: `curl -H "Host: prabhusteel.com" http://127.0.0.1:3000/`

Sign in to the CMS at `/admin/login` with a `tenant_admin` account (create
one via the Super Admin console, or directly against the API — see
`backend/app/modules/auth/admin_users_router.py`). The seeded super_admin
signs in the same way and lands on `/super-admin/tenants`.

## Docker Compose

Production (see [`DEPLOYMENT.md`](DEPLOYMENT.md) for DNS, TLS and secrets):

```bash
cd infra
cp .env.example .env   # BASE_DOMAIN, SUPER_ADMIN_DOMAIN, TLS, DB/JWT secrets
docker compose pull && docker compose up -d --wait   # images come from GHCR
```

To run the full production stack locally — Traefik, subdomain routing and
all — set these in `infra/.env` (plus any non-placeholder secrets):

```bash
BASE_DOMAIN=localhost
SUPER_ADMIN_DOMAIN=admin.localhost
TLS_CHALLENGE=selfsigned
```

then `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build`
and open `https://prabhusteels.localhost`, `https://hydro-holdings.localhost`,
`https://admin.localhost` (accept the self-signed cert). `*.localhost`
resolves to 127.0.0.1 without `/etc/hosts` edits. The dev override also
publishes MySQL/backend/frontend on 127.0.0.1 and adds Adminer on :8080.

The one-shot `migrate` service runs `alembic upgrade head` and the
idempotent seed before the API starts, so a fresh environment is usable
immediately.

## Onboarding a new tenant (or a new domain for an existing one)

1. Super Admin console → Tenants → New Tenant. Its slug is its subdomain:
   slug `acme` is served at `https://acme.<BASE_DOMAIN>` immediately — the
   wildcard DNS record and wildcard cert (`TLS_CHALLENGE=dns`) already
   cover it. With `TLS_CHALLENGE=http`, also append the slug to
   `TENANT_SUBDOMAINS` in `infra/.env` and run `docker compose up -d`.
2. Different subdomain or the tenant's own domain: add the hostname under
   the tenant's Domains in the console (explicit domains win over the slug).
   A hostname outside `BASE_DOMAIN` also goes in `CUSTOM_DOMAINS` in
   `infra/.env` (then `docker compose up -d`), with DNS pointing at the
   server. See [`TRAEFIK.md`](TRAEFIK.md).
3. Create the tenant's first `tenant_admin` from the Super Admin console;
   they sign in at `https://<slug>.<BASE_DOMAIN>/admin/login`.
   See [`CMS.md`](CMS.md) for the role model.

## Migrating a legacy tenant's data

See `migration/README.md` for the full procedure — this only needs to run
once per tenant, at that tenant's cutover.

## Copying local data to a server

To give a demo/staging server the content you entered locally (every row
of your local database plus `backend/uploads`), from the repo root:

```bash
infra/server/push-local-data.sh root@<server-ip>
infra/server/push-local-data.sh -i ~/.ssh/<key> root@<server-ip>   # with a specific SSH key
```

It **replaces** all data on the server, so admin logins become your local
ones. It refuses to run unless local and server are at the same Alembic
revision, asks for confirmation, and backs up the server's database to
`/opt/prabhu-platform/backups/` first; the end of its output prints the
command that restores that backup. The API and frontend are down for the
import (about a minute). Uploaded files are replaced without a backup.

## Common operational tasks

- **Rotate the JWT secret**: update `JWT_SECRET` in `infra/.env`, redeploy
  the backend. All existing sessions are invalidated immediately (by
  design — there's no refresh-token mechanism to preserve).
- **Add/remove a domain for a tenant**: Super Admin console → Tenants →
  expand a tenant → add/remove under Domains. Only hostnames outside
  `BASE_DOMAIN` also need a `CUSTOM_DOMAINS` change in `infra/.env`.
- **Enable the shareholder registry for a tenant**: Super Admin console →
  Tenants → toggle "Shareholder Module" for that tenant.
