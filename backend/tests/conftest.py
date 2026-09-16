import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.core.security import hash_password
from app.db import base_all  # noqa: F401
from app.db.session import Base, get_db
from app.main import app
from app.modules.auth.models import AdminRole, AdminUser
from app.modules.tenants.models import Tenant, TenantDomain

settings = get_settings()

# Runs against the same throwaway MySQL instance used for local dev
# (see docs/RUNBOOK.md) — a dedicated schema so tests never touch seeded data.
# Built field-by-field (not via str.replace on the URL) since db_name is a
# substring of db_user here and a naive replace corrupts the username too.
TEST_DB_URL = (
    f"mysql+pymysql://{settings.db_user}:{settings.db_password}"
    f"@{settings.db_host}:{settings.db_port}/{settings.db_name}_test?charset=utf8mb4"
)
engine = create_engine(TEST_DB_URL, pool_pre_ping=True)
TestSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture(scope="session", autouse=True)
def _create_schema():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session():
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        for table in reversed(Base.metadata.sorted_tables):
            session.execute(table.delete())
        session.commit()
        session.close()


@pytest.fixture()
def client(db_session):
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def make_tenant(db_session, slug: str, hostname: str) -> Tenant:
    tenant = Tenant(slug=slug, name=slug.title())
    tenant.domains.append(TenantDomain(hostname=hostname, is_primary=True))
    db_session.add(tenant)
    db_session.commit()
    db_session.refresh(tenant)
    return tenant


def make_tenant_admin(db_session, tenant: Tenant, username: str, password: str) -> AdminUser:
    admin = AdminUser(
        tenant_id=tenant.id,
        name=username,
        email=f"{username}@example.com",
        username=username,
        password_hash=hash_password(password),
        role=AdminRole.tenant_admin,
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


def make_super_admin(db_session, username: str, password: str) -> AdminUser:
    admin = AdminUser(
        tenant_id=None,
        name=username,
        email=f"{username}@example.com",
        username=username,
        password_hash=hash_password(password),
        role=AdminRole.super_admin,
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


def login(client, username: str, password: str) -> str:
    resp = client.post("/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]
