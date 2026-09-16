"""LoginRateLimiter (app/core/rate_limit.py) must throttle repeated failed
logins per (ip, username) well before the app-wide RateLimitMiddleware
budget (120 req/60s) would ever kick in, and must not punish an account
once it logs in successfully."""

import pytest

from app.core.config import get_settings
from app.core.rate_limit import login_rate_limiter

from tests.conftest import make_tenant, make_tenant_admin

settings = get_settings()


@pytest.fixture(autouse=True)
def _reset_login_rate_limiter():
    # login_rate_limiter is a module-level singleton (same single-instance
    # design as RateLimitMiddleware) shared across every test in the
    # process, so state from one test would otherwise leak into the next.
    login_rate_limiter._attempts.clear()
    yield
    login_rate_limiter._attempts.clear()


def _exhaust_budget(client, username: str) -> None:
    for _ in range(settings.login_rate_limit_attempts):
        resp = client.post("/auth/login", json={"username": username, "password": "wrong"})
        assert resp.status_code == 401


def test_login_locks_out_after_repeated_failures(client, db_session):
    tenant = make_tenant(db_session, "tenant-a", "a.example.com")
    make_tenant_admin(db_session, tenant, "admin_a", "password123")

    _exhaust_budget(client, "admin_a")

    resp = client.post("/auth/login", json={"username": "admin_a", "password": "password123"})
    assert resp.status_code == 429


def test_successful_login_clears_the_failure_count(client, db_session):
    tenant = make_tenant(db_session, "tenant-a", "a.example.com")
    make_tenant_admin(db_session, tenant, "admin_a", "password123")

    for _ in range(settings.login_rate_limit_attempts - 1):
        resp = client.post("/auth/login", json={"username": "admin_a", "password": "wrong"})
        assert resp.status_code == 401

    resp = client.post("/auth/login", json={"username": "admin_a", "password": "password123"})
    assert resp.status_code == 200

    # The failure count for this (ip, username) pair was reset on success,
    # so the account isn't left one attempt away from a lockout it didn't
    # actually approach.
    login_rate_limiter.check("testclient", "admin_a")


def test_lockout_is_scoped_to_the_offending_username_not_the_whole_ip(client, db_session):
    tenant = make_tenant(db_session, "tenant-a", "a.example.com")
    make_tenant_admin(db_session, tenant, "admin_a", "password123")
    make_tenant_admin(db_session, tenant, "admin_b", "password123")

    _exhaust_budget(client, "admin_a")

    resp = client.post("/auth/login", json={"username": "admin_b", "password": "password123"})
    assert resp.status_code == 200
