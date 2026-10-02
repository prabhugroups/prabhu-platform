"""seed_tenants (app/db/seed.py) seeds a deployment's own tenants: nothing
by default (a new company's deployment must not inherit Prabhu's sites), a
named preset when asked, idempotently, and rejects unknown preset names."""

import pytest

from app.db.seed import available_tenant_presets, seed_tenants
from app.modules.tenants.models import Tenant

from tests.conftest import make_tenant


@pytest.mark.parametrize("preset", ["", "none", "  NONE "])
def test_no_preset_seeds_nothing(db_session, preset):
    seed_tenants(db_session, preset)
    assert db_session.query(Tenant).count() == 0


def test_prabhu_preset_seeds_its_tenants_idempotently(db_session):
    seed_tenants(db_session, "prabhu")
    seed_tenants(db_session, "prabhu")
    slugs = {t.slug for t in db_session.query(Tenant).all()}
    assert len(slugs) == 7 and "prabhusteels" in slugs
    steel = db_session.query(Tenant).filter_by(slug="prabhusteels").one()
    assert [(d.hostname, d.is_primary) for d in steel.domains] == [
        ("prabhusteel.com", True),
        ("www.prabhusteel.com", False),
    ]


def test_existing_tenant_is_left_untouched(db_session):
    make_tenant(db_session, "prabhusteels", "custom.example.org")
    seed_tenants(db_session, "prabhu")
    steel = db_session.query(Tenant).filter_by(slug="prabhusteels").one()
    assert [d.hostname for d in steel.domains] == ["custom.example.org"]


@pytest.mark.parametrize("preset", ["acme", "../tenant_presets/prabhu", "prabhu.json"])
def test_unknown_preset_is_rejected(db_session, preset):
    with pytest.raises(SystemExit):
        seed_tenants(db_session, preset)
    assert db_session.query(Tenant).count() == 0


def test_presets_are_listed():
    assert "prabhu" in available_tenant_presets()
