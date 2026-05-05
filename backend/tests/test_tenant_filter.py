from __future__ import annotations

from flask import g
from sqlalchemy import select

from app.extensions import db
from app.models import User
from tests.conftest import make_tenant, make_user


def test_tenant_filter_isolates_queries(app, tenant):
    other = make_tenant(slug="globex", name="Globex Inc")
    make_user(tenant, email="a@acme.io", role_codes=["tech"])
    make_user(other, email="b@globex.io", role_codes=["tech"])
    db.session.commit()

    # Pretend we're acting as `tenant` (acme) — the filter should hide globex users
    g.skip_tenant_filter = False
    g.tenant_id = tenant.id

    rows = db.session.scalars(select(User)).all()
    emails = {u.email for u in rows}
    assert "a@acme.io" in emails
    assert "b@globex.io" not in emails


def test_skip_tenant_filter_returns_all(app, tenant):
    other = make_tenant(slug="globex", name="Globex Inc")
    make_user(tenant, email="a@acme.io", role_codes=["tech"])
    make_user(other, email="b@globex.io", role_codes=["tech"])
    db.session.commit()

    g.skip_tenant_filter = True
    rows = db.session.scalars(select(User)).all()
    emails = {u.email for u in rows}
    assert "a@acme.io" in emails
    assert "b@globex.io" in emails
