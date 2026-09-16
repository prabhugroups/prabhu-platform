from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings, validate_production_config
from app.core.rate_limit import RateLimitMiddleware
from app.modules.about_page.router import router as about_page_router
from app.modules.applications.router import router as applications_router
from app.modules.auth.admin_users_router import router as admin_users_router
from app.modules.auth.router import router as auth_router
from app.modules.banner.router import router as banner_router
from app.modules.contacts.router import router as contacts_router
from app.modules.dashboard.router import router as dashboard_router
from app.modules.documents.router import router as documents_router
from app.modules.faqs.router import router as faqs_router
from app.modules.gallery.router import router as gallery_router
from app.modules.home_content.router import router as home_content_router
from app.modules.locations.router import router as locations_router
from app.modules.media.router import router as media_router
from app.modules.nav.router import router as nav_router
from app.modules.page_seo.router import router as page_seo_router
from app.modules.popup.router import router as popup_router
from app.modules.portfolio.router import router as portfolio_router
from app.modules.settings.router import router as settings_router
from app.modules.shareholders.router import router as shareholders_router
from app.modules.teams.router import router as teams_router
from app.modules.tenant_contact.router import router as tenant_contact_router
from app.modules.tenants.router import router as tenants_router
from app.modules.tenants.router import super_router as tenants_super_router

settings = get_settings()
validate_production_config(settings)

app = FastAPI(title=settings.app_name)

# No CORS middleware: FastAPI is never routed by Traefik and is only ever
# called server-side by the Next.js container over the internal docker
# network (see infra/docker-compose.yml) or directly by browsers for the one
# public /media/* static path — see infra/traefik config. This removes the
# CORS-misconfiguration bug class the legacy-repo audit found (two tenants
# had an active, wrong-domain CORS allowlist copy-pasted from another tenant).
app.add_middleware(RateLimitMiddleware)

Path(settings.uploads_dir).mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.uploads_dir), name="media")

for router in (
    auth_router,
    admin_users_router,
    tenants_router,
    tenants_super_router,
    nav_router,
    settings_router,
    teams_router,
    documents_router,
    faqs_router,
    gallery_router,
    portfolio_router,
    popup_router,
    banner_router,
    home_content_router,
    tenant_contact_router,
    about_page_router,
    page_seo_router,
    contacts_router,
    applications_router,
    shareholders_router,
    locations_router,
    media_router,
    dashboard_router,
):
    app.include_router(router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
