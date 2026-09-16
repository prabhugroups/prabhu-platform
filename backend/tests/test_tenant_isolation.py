"""The core security requirement of this platform: a tenant_admin token must
never be able to read, write, or enumerate another tenant's data, even when
it explicitly tries to (a spoofed X-Tenant-Id header, a guessed row id).
"""

from tests.conftest import login, make_tenant, make_tenant_admin


def _create_team_member(client, token: str) -> int:
    resp = client.post(
        "/admin/teams",
        json={"type": "director", "additional_info": {"name": "Someone"}},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def test_tenant_admin_cannot_list_another_tenants_rows(client, db_session):
    tenant_a = make_tenant(db_session, "tenant-a", "a.example.com")
    tenant_b = make_tenant(db_session, "tenant-b", "b.example.com")
    make_tenant_admin(db_session, tenant_a, "admin_a", "password123")
    make_tenant_admin(db_session, tenant_b, "admin_b", "password123")

    token_a = login(client, "admin_a", "password123")
    _create_team_member(client, token_a)

    token_b = login(client, "admin_b", "password123")
    resp = client.get("/admin/teams", headers={"Authorization": f"Bearer {token_b}"})
    assert resp.status_code == 200
    assert resp.json() == []


def test_spoofed_x_tenant_id_header_is_ignored_for_tenant_admin(client, db_session):
    tenant_a = make_tenant(db_session, "tenant-a", "a.example.com")
    tenant_b = make_tenant(db_session, "tenant-b", "b.example.com")
    make_tenant_admin(db_session, tenant_a, "admin_a", "password123")
    make_tenant_admin(db_session, tenant_b, "admin_b", "password123")

    token_a = login(client, "admin_a", "password123")
    _create_team_member(client, token_a)

    token_b = login(client, "admin_b", "password123")
    resp = client.get(
        "/admin/teams",
        headers={"Authorization": f"Bearer {token_b}", "X-Tenant-Id": str(tenant_a.id)},
    )
    assert resp.status_code == 200
    assert resp.json() == [], "tenant_b must never see tenant_a's rows, even via a spoofed header"


def test_tenant_admin_cannot_fetch_another_tenants_row_by_guessed_id(client, db_session):
    tenant_a = make_tenant(db_session, "tenant-a", "a.example.com")
    tenant_b = make_tenant(db_session, "tenant-b", "b.example.com")
    make_tenant_admin(db_session, tenant_a, "admin_a", "password123")
    make_tenant_admin(db_session, tenant_b, "admin_b", "password123")

    token_a = login(client, "admin_a", "password123")
    row_id = _create_team_member(client, token_a)

    token_b = login(client, "admin_b", "password123")
    resp = client.get(f"/admin/teams/{row_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert resp.status_code == 404


def test_tenant_admin_cannot_delete_another_tenants_row(client, db_session):
    tenant_a = make_tenant(db_session, "tenant-a", "a.example.com")
    tenant_b = make_tenant(db_session, "tenant-b", "b.example.com")
    make_tenant_admin(db_session, tenant_a, "admin_a", "password123")
    make_tenant_admin(db_session, tenant_b, "admin_b", "password123")

    token_a = login(client, "admin_a", "password123")
    row_id = _create_team_member(client, token_a)

    token_b = login(client, "admin_b", "password123")
    resp = client.delete(f"/admin/teams/{row_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert resp.status_code == 404

    # still there from tenant_a's point of view
    resp = client.get("/admin/teams", headers={"Authorization": f"Bearer {token_a}"})
    assert len(resp.json()) == 1


def test_unauthenticated_request_to_admin_endpoint_is_rejected(client):
    resp = client.get("/admin/teams")
    assert resp.status_code == 401


def test_public_endpoint_requires_explicit_tenant_slug_and_cannot_leak_other_tenants(client, db_session):
    tenant_a = make_tenant(db_session, "tenant-a", "a.example.com")
    tenant_b = make_tenant(db_session, "tenant-b", "b.example.com")
    make_tenant_admin(db_session, tenant_a, "admin_a", "password123")
    token_a = login(client, "admin_a", "password123")
    _create_team_member(client, token_a)

    resp = client.get("/teams", headers={"X-Tenant-Slug": "tenant-b"})
    assert resp.status_code == 200
    assert resp.json() == []

    resp = client.get("/teams", headers={"X-Tenant-Slug": "tenant-a"})
    assert resp.status_code == 200
    assert len(resp.json()) == 1
