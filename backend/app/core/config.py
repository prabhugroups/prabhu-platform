from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Absolute path so config loads correctly regardless of the caller's CWD —
# e.g. migration/scripts/migrate_tenant.py imports this module while running
# from the repo root, not from backend/.
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Prabhu Platform API"
    environment: str = "development"

    db_host: str = "127.0.0.1"
    db_port: int = 3306
    db_name: str = "prabhu_platform"
    db_user: str = "prabhu_platform"
    db_password: str = "changeme"

    jwt_secret: str = "changeme-generate-a-real-secret"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 12

    uploads_dir: str = "./uploads"
    max_upload_bytes: int = 25 * 1024 * 1024

    rate_limit_requests: int = 120
    rate_limit_window_seconds: int = 60

    # Tighter, credential-stuffing-specific budget for /auth/login — see
    # app/core/rate_limit.py:LoginRateLimiter.
    login_rate_limit_attempts: int = 5
    login_rate_limit_window_seconds: int = 300

    # Subdomain tenant routing: with TENANT_BASE_DOMAIN=example.com, a request
    # for `<slug>.example.com` resolves to the tenant with that slug whenever
    # no explicit tenant_domains row matches the hostname first (see
    # app/modules/tenants/router.py:resolve_tenant_by_domain). Empty disables
    # the fallback, leaving explicit tenant_domains rows as the only mapping.
    tenant_base_domain: str = ""

    # True when running behind Traefik (infra/docker-compose.yml). Traefik
    # always sets X-Forwarded-For on what it forwards, and uvicorn's
    # --proxy-headers turns that into request.client.host — so a request
    # WITHOUT one never came from the public edge: it's the Next.js server
    # calling over the docker-internal network on behalf of many visitors at
    # once. See app/core/rate_limit.py for why that matters.
    behind_proxy: bool = False

    # Tenant preset created by `python -m app.db.seed` (app/db/seed.py):
    # a file name in app/db/seed_data/tenant_presets/, or empty/"none".
    seed_tenants: str = ""

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}?charset=utf8mb4"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


# Placeholder values from Settings' own field defaults above — kept as a
# separate mapping (not re-read off the class) so this stays correct even if
# a default value string is edited later. Values are placeholders compared
# against at boot, not real secrets (bandit B105 false-positives on this).
_INSECURE_DEFAULTS = {
    "jwt_secret": "changeme-generate-a-real-secret",  # nosec B105
    "db_password": "changeme",  # nosec B105
}


def validate_production_config(settings: Settings) -> None:
    """Called once at app startup (see app/main.py). docs/DEPLOYMENT.md
    already tells operators to generate real secrets before going live; this
    makes forgetting a hard failure at boot instead of a silently-insecure
    production deployment signing tokens with a guessable secret."""
    if settings.environment != "production":
        return
    insecure = [
        name
        for name, default in _INSECURE_DEFAULTS.items()
        if getattr(settings, name) == default
        # The "change-me-..." placeholders shipped in the .env.example files.
        or getattr(settings, name).lower().startswith(("change-me", "changeme"))
    ]
    if insecure:
        raise RuntimeError(
            "Refusing to start: ENVIRONMENT=production but still using the insecure "
            f"default value for: {', '.join(insecure)}. Generate real secrets "
            "(see docs/DEPLOYMENT.md) and set them in .env before starting."
        )
