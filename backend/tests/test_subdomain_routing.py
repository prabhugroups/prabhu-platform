"""resolve_tenant_by_domain (app/modules/tenants/router.py): `<slug>.<base>`
must route to that tenant via TENANT_BASE_DOMAIN, while explicit
tenant_domains rows keep precedence and nothing outside the base domain (or
deeper than one label) resolves by slug."""

import pytest

from app.core.config import get_settings

from tests.conftest import make_tenant


@pytest.fixture(autouse=True)
def _base_domain(monkeypatch):
    monkeypatch.setattr(get_settings(), "tenant_base_domain", "example.com")


def _resolve(client, host: str):
    return client.get(f"/internal/tenants/by-domain/{host}")


def test_subdomain_resolves_each_tenant_by_slug(client, db_session):
    make_tenant(db_session, "alpha", "alpha-custom.org")
    make_tenant(db_session, "beta", "beta-custom.org")

    assert _resolve(client, "alpha.example.com").json()["slug"] == "alpha"
    assert _resolve(client, "beta.example.com").json()["slug"] == "beta"
    assert _resolve(client, "www.beta.example.com").json()["slug"] == "beta"
    assert _resolve(client, "ALPHA.example.com:443").json()["slug"] == "alpha"


def test_explicit_domain_row_wins_over_slug(client, db_session):
    make_tenant(db_session, "alpha", "alpha-custom.org")
    make_tenant(db_session, "beta", "alpha.example.com")

    assert _resolve(client, "alpha.example.com").json()["slug"] == "beta"


@pytest.mark.parametrize(
    "host",
    [
        "example.com",  # bare base domain
        "x.alpha.example.com",  # more than one label deep
        "alpha.example.org",  # different base domain
        "alphaexample.com",  # suffix match without the dot
        "unknown.example.com",  # no such slug
    ],
)
def test_non_matching_hosts_404(client, db_session, host):
    make_tenant(db_session, "alpha", "alpha-custom.org")
    assert _resolve(client, host).status_code == 404


def test_inactive_tenant_does_not_resolve_by_slug(client, db_session):
    tenant = make_tenant(db_session, "alpha", "alpha-custom.org")
    tenant.is_active = False
    db_session.commit()

    assert _resolve(client, "alpha.example.com").status_code == 404


def test_fallback_disabled_without_base_domain(client, db_session, monkeypatch):
    monkeypatch.setattr(get_settings(), "tenant_base_domain", "")
    make_tenant(db_session, "alpha", "alpha-custom.org")

    assert _resolve(client, "alpha.example.com").status_code == 404
    assert _resolve(client, "alpha-custom.org").json()["slug"] == "alpha"
