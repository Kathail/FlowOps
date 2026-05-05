from __future__ import annotations

from app.extensions import db
from tests.conftest import login_client, make_tenant, make_user


def test_list_users_admin(admin_client, admin_user):
    resp = admin_client.get("/api/v1/users")
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["total"] >= 1
    emails = {u["email"] for u in body["items"]}
    assert "admin@acme.io" in emails


def test_list_users_non_admin_403(tech_client):
    resp = tech_client.get("/api/v1/users")
    assert resp.status_code == 403


def test_list_users_unauthenticated_401(client):
    resp = client.get("/api/v1/users")
    assert resp.status_code == 401


def test_create_user(admin_client):
    resp = admin_client.post(
        "/api/v1/users",
        json={
            "email": "newbie@acme.io",
            "full_name": "New Bee",
            "password": "AnotherStrongP@ss",
            "role_codes": ["tech"],
        },
    )
    assert resp.status_code == 201, resp.get_json()
    body = resp.get_json()
    assert body["email"] == "newbie@acme.io"
    assert any(r["code"] == "tech" for r in body["roles"])


def test_create_user_duplicate_email_409(admin_client, tenant):
    make_user(tenant, email="dupe@acme.io", role_codes=["tech"])
    db.session.commit()

    resp = admin_client.post(
        "/api/v1/users",
        json={
            "email": "dupe@acme.io",
            "full_name": "Dup Lic",
            "password": "AnotherStrongP@ss",
        },
    )
    assert resp.status_code == 409


def test_get_user_by_uid(admin_client, tenant):
    user = make_user(tenant, email="grant@acme.io", role_codes=["tech"])
    db.session.commit()
    uid = user.user_uid

    resp = admin_client.get(f"/api/v1/users/{uid}")
    assert resp.status_code == 200
    assert resp.get_json()["email"] == "grant@acme.io"


def test_update_user(admin_client, tenant):
    user = make_user(tenant, email="upd@acme.io", role_codes=["tech"])
    db.session.commit()

    resp = admin_client.patch(
        f"/api/v1/users/{user.user_uid}",
        json={"full_name": "Renamed", "is_active": False},
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["full_name"] == "Renamed"
    assert body["is_active"] is False


def test_soft_delete_user(admin_client, tenant):
    user = make_user(tenant, email="rm@acme.io", role_codes=["tech"])
    db.session.commit()
    uid = user.user_uid

    resp = admin_client.delete(f"/api/v1/users/{uid}")
    assert resp.status_code == 204

    listed = admin_client.get("/api/v1/users").get_json()
    assert all(u["user_uid"] != uid for u in listed["items"])


def test_self_delete_blocked(admin_client, admin_user):
    resp = admin_client.delete(f"/api/v1/users/{admin_user.user_uid}")
    assert resp.status_code == 409
    assert resp.get_json()["error"]["code"] == "self_delete"


def test_assign_roles(admin_client, tenant):
    user = make_user(tenant, email="role@acme.io", role_codes=["tech"])
    db.session.commit()

    resp = admin_client.post(
        f"/api/v1/users/{user.user_uid}/roles",
        json={"role_codes": ["supervisor", "readonly"]},
    )
    assert resp.status_code == 200
    body = resp.get_json()
    codes = {r["code"] for r in body["roles"]}
    assert codes == {"supervisor", "readonly"}


def test_cross_tenant_user_access_returns_404(app, client, admin_user):
    """User from tenant A can't read tenant B's user via uid — must be 404 not 403."""
    other_tenant = make_tenant(slug="globex", name="Globex Inc")
    other_user = make_user(other_tenant, email="ghost@globex.io", role_codes=["admin"])
    db.session.commit()
    other_uid = other_user.user_uid

    # Login as the original tenant's admin
    login_client(client, "acme", "admin@acme.io")

    resp = client.get(f"/api/v1/users/{other_uid}")
    assert resp.status_code == 404


def test_cross_tenant_list_isolated(app, client, admin_user):
    other_tenant = make_tenant(slug="globex", name="Globex Inc")
    make_user(other_tenant, email="ghost@globex.io", role_codes=["admin"])
    db.session.commit()

    login_client(client, "acme", "admin@acme.io")
    body = client.get("/api/v1/users").get_json()
    emails = {u["email"] for u in body["items"]}
    assert "ghost@globex.io" not in emails
