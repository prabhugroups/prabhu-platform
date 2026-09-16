# Prabhu Platform

One multi-tenant Next.js + FastAPI + MySQL platform serving 7 Prabhu Group
subsidiary websites, replacing 14 separate per-tenant repos.

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — why and how the system is built.
- [`docs/RUNBOOK.md`](docs/RUNBOOK.md) — run it locally or via Docker Compose.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — full production deployment plan (server setup, secrets, CI/CD, backups).
- [`docs/CMS.md`](docs/CMS.md) — how the CMS works: roles, content model, media, branding.
- [`docs/SECURITY.md`](docs/SECURITY.md) — OWASP Top 10 mitigations, rate limiting, and DDoS protection (Cloudflare + fail2ban setup).
- [`docs/TRAEFIK.md`](docs/TRAEFIK.md) — routing, TLS, and domain onboarding.
- [`migration/README.md`](migration/README.md) — migrating a legacy tenant's data.
- [`docs/ROLLBACK.md`](docs/ROLLBACK.md) — the rollback procedure.

```
backend/     FastAPI modular monolith (SQLAlchemy + Alembic + MySQL)
frontend/    Next.js 16 app — public tenant sites + Tenant/Super Admin CMS
infra/       Docker Compose + Traefik config
migration/   Legacy-data migration tooling + runbook
docs/        Architecture, runbook, rollback
```

Quick start (no Docker required):

```bash
# Backend
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env   # point at a MySQL 8.0 instance, set JWT_SECRET
.venv/bin/alembic upgrade head
SEED_SUPER_ADMIN_PASSWORD='change-me' .venv/bin/python -m app.db.seed
.venv/bin/uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend && npm install
cp .env.local.example .env.local
npm run dev
```

Then visit with a tenant Host header, e.g. `curl -H "Host: prabhusteel.com" http://127.0.0.1:3000/`,
or add the 7 real domains to `/etc/hosts` pointing at `127.0.0.1`. Full
details in [`docs/RUNBOOK.md`](docs/RUNBOOK.md).
