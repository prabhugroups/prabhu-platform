"""validate_production_config must refuse to boot a production API with the
built-in defaults or the .env.example placeholders as secrets."""

import pytest

from app.core.config import Settings, validate_production_config


def _settings(**overrides) -> Settings:
    values = {"environment": "production", "jwt_secret": "a" * 64, "db_password": "s3cure-Pass"}
    values.update(overrides)
    return Settings(_env_file=None, **values)


@pytest.mark.parametrize(
    "overrides",
    [
        {"jwt_secret": "changeme-generate-a-real-secret"},
        {"jwt_secret": "change-me-generate-a-real-secret"},
        {"db_password": "change-me-generate-a-real-password"},
        {"db_password": "changeme"},
    ],
)
def test_placeholder_secrets_refuse_to_boot(overrides):
    with pytest.raises(RuntimeError):
        validate_production_config(_settings(**overrides))


def test_real_secrets_boot():
    validate_production_config(_settings())


def test_non_production_is_not_checked():
    validate_production_config(_settings(environment="development", jwt_secret="changeme"))
