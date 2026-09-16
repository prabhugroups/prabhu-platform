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

## Docker Compose (production-shaped)

```bash
cd infra
cp .env.example .env   # fill in real DB/JWT secrets, ACME_EMAIL, SUPER_ADMIN_DOMAIN
docker compose up -d --build
```

`docker-compose.dev.yml` adds host-port publishing + Adminer for local
container-based development:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

The backend container runs `alembic upgrade head` and the idempotent seed
script on every start, so a fresh environment is usable immediately. See
[`DEPLOYMENT.md`](DEPLOYMENT.md) for the real production version of this
(DNS, secret generation, CI/CD, backups).

## Onboarding a new tenant (or a new domain for an existing one)

1. Super Admin console → Tenants → New Tenant (slug, name, primary domain),
   or call `POST /super/tenants` directly.
2. Add a real DNS A/AAAA record for the new domain pointing at the server.
3. Add a matching router block to `infra/traefik/dynamic/routers.yml.template`
   for that hostname (Traefik's file provider hot-reloads on change — no
   restart needed) and redeploy that one file. See
   [`TRAEFIK.md`](TRAEFIK.md) for why both this step and step 1 are
   required together.
4. Create the tenant's first `tenant_admin` from the Super Admin console.
   See [`CMS.md`](CMS.md) for the Super Admin / Tenant Admin role model and
   what each can configure.

## Migrating a legacy tenant's data

See `migration/README.md` for the full procedure — this only needs to run
once per tenant, at that tenant's cutover.

## Common operational tasks

- **Rotate the JWT secret**: update `JWT_SECRET` in `infra/.env`, redeploy
  the backend. All existing sessions are invalidated immediately (by
  design — there's no refresh-token mechanism to preserve).
- **Add/remove a domain for a tenant**: Super Admin console → Tenants →
  expand a tenant → add/remove under Domains, then update
  `infra/traefik/dynamic/routers.yml.template` to match and redeploy Traefik.
- **Enable the shareholder registry for a tenant**: Super Admin console →
  Tenants → toggle "Shareholder Module" for that tenant.
