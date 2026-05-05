from __future__ import annotations

from sqlalchemy import select

from app.extensions import db
from app.models import User
from tests.conftest import DEFAULT_PASSWORD


def test_register_tenant_happy_path(client):
    resp = client.post(
        "/api/v1/auth/register-tenant",
        json={
            "tenant_name": "Acme Water",
            "slug": "acme",
            "admin_email": "admin@acme.io",
            "admin_password": "VeryStrongP@ss123",
            "full_name": "Admin User",
        },
    )
    assert resp.status_code == 201, resp.get_json()
    body = resp.get_json()
    assert body["tenant"]["slug"] == "acme"
    assert body["user"]["email"] == "admin@acme.io"
    assert any(r["code"] == "admin" for r in body["user"]["roles"])

    # Should be logged in immediately
    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200


def test_register_tenant_duplicate_slug_409(client, tenant):
    resp = client.post(
        "/api/v1/auth/register-tenant",
        json={
            "tenant_name": "Other Co",
            "slug": "acme",
            "admin_email": "other@elsewhere.io",
            "admin_password": "VeryStrongP@ss123",
            "full_name": "Other Admin",
        },
    )
    assert resp.status_code == 409
    assert resp.get_json()["error"]["code"] == "slug_taken"


def test_register_tenant_weak_password_422(client):
    resp = client.post(
        "/api/v1/auth/register-tenant",
        json={
            "tenant_name": "Acme",
            "slug": "acme",
            "admin_email": "admin@acme.io",
            "admin_password": "short",
            "full_name": "Admin",
        },
    )
    assert resp.status_code == 422


def test_login_success(client, admin_user):
    resp = client.post(
        "/api/v1/auth/login",
        json={
            "tenant_slug": "acme",
            "email": "admin@acme.io",
            "password": DEFAULT_PASSWORD,
        },
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["user"]["email"] == "admin@acme.io"
    assert body["tenant"]["slug"] == "acme"


def test_login_session_cookie_attributes(client, admin_user):
    resp = client.post(
        "/api/v1/auth/login",
        json={
            "tenant_slug": "acme",
            "email": "admin@acme.io",
            "password": DEFAULT_PASSWORD,
        },
    )
    set_cookie = resp.headers.get_all("Set-Cookie")
    session_cookie = next((c for c in set_cookie if c.startswith("session=")), "")
    assert "HttpOnly" in session_cookie
    assert "SameSite=Lax" in session_cookie


def test_login_bad_password(client, admin_user):
    resp = client.post(
        "/api/v1/auth/login",
        json={
            "tenant_slug": "acme",
            "email": "admin@acme.io",
            "password": "wrong-password",
        },
    )
    assert resp.status_code == 401
    assert resp.get_json()["error"]["code"] == "bad_credentials"


def test_login_unknown_tenant(client, admin_user):
    resp = client.post(
        "/api/v1/auth/login",
        json={
            "tenant_slug": "nope",
            "email": "admin@acme.io",
            "password": DEFAULT_PASSWORD,
        },
    )
    assert resp.status_code == 401


def test_login_inactive_account(app, client, tenant):
    from tests.conftest import make_user

    make_user(
        tenant,
        email="off@acme.io",
        role_codes=["tech"],
        is_active=False,
    )
    db.session.commit()

    resp = client.post(
        "/api/v1/auth/login",
        json={
            "tenant_slug": "acme",
            "email": "off@acme.io",
            "password": DEFAULT_PASSWORD,
        },
    )
    assert resp.status_code == 401
    assert resp.get_json()["error"]["code"] == "inactive"


def test_logout_clears_session(admin_client):
    resp = admin_client.post("/api/v1/auth/logout")
    assert resp.status_code == 204

    me = admin_client.get("/api/v1/auth/me")
    assert me.status_code == 401


def test_me_unauthenticated_401(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_me_returns_user_and_tenant(admin_client):
    resp = admin_client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["user"]["email"] == "admin@acme.io"
    assert body["tenant"]["slug"] == "acme"
    assert any(r["code"] == "admin" for r in body["user"]["roles"])


def test_password_change_happy(admin_client):
    resp = admin_client.post(
        "/api/v1/auth/password/change",
        json={"current": DEFAULT_PASSWORD, "new": "NewStrongP@ss567"},
    )
    assert resp.status_code == 204


def test_password_change_wrong_current(admin_client):
    resp = admin_client.post(
        "/api/v1/auth/password/change",
        json={"current": "wrong", "new": "NewStrongP@ss567"},
    )
    assert resp.status_code == 401


def test_password_change_weak_new(admin_client):
    resp = admin_client.post(
        "/api/v1/auth/password/change",
        json={"current": DEFAULT_PASSWORD, "new": "short"},
    )
    assert resp.status_code == 422


def test_argon2_hash_format(admin_user):
    user = db.session.scalar(
        select(User).where(User.email == "admin@acme.io").execution_options(skip_tenant_filter=True)
    )
    assert user is not None
    assert user.password_hash.startswith("$argon2id$"), user.password_hash
