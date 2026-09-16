# Prabhu Platform

A single modular monolith replacing 7 independently-deployed Prabhu Group
subsidiary websites (14 repositories) with one multi-tenant stack: a
Next.js frontend and a FastAPI backend behind Traefik, backed by one MySQL
database with `tenant_id`-scoped tables.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full rationale and
data model.

## Stack

- **Frontend:** Next.js 16 / React 19, server-rendered, calls the backend
  server-side over the docker-internal network.
- **Backend:** FastAPI + SQLAlchemy + Alembic, MySQL, JWT auth. Never
  exposed to the internet directly — only Traefik → Next.js is public.
- **Infra:** Traefik (TLS termination + routing), Docker Compose, MySQL.

## Local development

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
cp infra/.env.example infra/.env
# fill in the copied .env files, then:
docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml up --build
```

This exposes:
- Frontend at `http://localhost:3000`
- Backend at `http://localhost:8000`
- Adminer (DB UI) at `http://localhost:8080`
- MySQL at `localhost:3306`

Run backend tests directly (outside Docker) with `pytest` from `backend/`,
and frontend e2e tests with `npx playwright test` from `frontend/`.

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — why this exists, topology, data model
- [docs/CMS.md](docs/CMS.md) — content model for tenant admins
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — production deploy process
- [docs/TRAEFIK.md](docs/TRAEFIK.md) — routing/TLS configuration
- [docs/RUNBOOK.md](docs/RUNBOOK.md) — operational procedures
- [docs/ROLLBACK.md](docs/ROLLBACK.md) — rollback procedures
- [docs/SECURITY.md](docs/SECURITY.md) — security model and considerations

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs backend tests (pytest,
bandit, pip-audit) and frontend checks (tsc, lint, npm audit, build) on
every PR, then builds and deploys Docker images on merge to `main`.
Dependabot keeps pip, npm, Docker base images, and GitHub Actions up to
date weekly.
