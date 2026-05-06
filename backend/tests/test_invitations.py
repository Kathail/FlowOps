from __future__ import annotations

from datetime import UTC, datetime, timedelta

from flask import g

from app.extensions import db
from app.models import Invitation, User


def test_admin_can_create_invitation(admin_client):
    resp = admin_client.post(
        "/api/v1/invitations",
        json={
            "email": "newhire@acme.io",
            "full_name": "New Hire",
            "role_codes": ["tech"],
        },
    )
    assert resp.status_code == 201, resp.get_json()
    body = resp.get_json()
    inv = body["invitation"]
    assert inv["email"] == "newhire@acme.io"
    assert inv["role_codes"] == ["tech"]
    assert inv["accepted_at"] is None
    assert inv["revoked_at"] is None
    assert inv["token_prefix"] and len(inv["token_prefix"]) == 8
    assert isinstance(body["token"], str) and len(body["token"]) >= 30
    assert body["accept_url"].endswith(body["token"])


def test_non_admin_cannot_create_invitation(supervisor_client):
    resp = supervisor_client.post(
        "/api/v1/invitations",
        json={"email": "x@acme.io", "role_codes": []},
    )
    assert resp.status_code == 403


def test_create_invitation_rejects_existing_email(admin_client, admin_user):
    resp = admin_client.post(
        "/api/v1/invitations",
        json={"email": admin_user.email, "role_codes": []},
    )
    assert resp.status_code == 409
    assert resp.get_json()["error"]["code"] == "email_taken"


def test_create_invitation_rejects_duplicate_pending(admin_client):
    first = admin_client.post(
        "/api/v1/invitations",
        json={"email": "dup@acme.io", "role_codes": []},
    )
    assert first.status_code == 201
    second = admin_client.post(
        "/api/v1/invitations",
        json={"email": "dup@acme.io", "role_codes": []},
    )
    assert second.status_code == 409
    assert second.get_json()["error"]["code"] == "invite_pending"


def test_create_invitation_rejects_unknown_role(admin_client):
    resp = admin_client.post(
        "/api/v1/invitations",
        json={"email": "x@acme.io", "role_codes": ["nonexistent"]},
    )
    assert resp.status_code == 422
    assert resp.get_json()["error"]["code"] == "unknown_role"


def test_admin_can_list_invitations(admin_client):
    admin_client.post(
        "/api/v1/invitations",
        json={"email": "a@acme.io", "role_codes": []},
    )
    admin_client.post(
        "/api/v1/invitations",
        json={"email": "b@acme.io", "role_codes": []},
    )
    resp = admin_client.get("/api/v1/invitations")
    body = resp.get_json()
    emails = {i["email"] for i in body["items"]}
    assert {"a@acme.io", "b@acme.io"}.issubset(emails)


def test_admin_can_revoke_invitation(admin_client):
    create = admin_client.post(
        "/api/v1/invitations",
        json={"email": "revoke@acme.io", "role_codes": []},
    )
    inv_id = create.get_json()["invitation"]["id"]
    resp = admin_client.delete(f"/api/v1/invitations/{inv_id}")
    assert resp.status_code == 200
    assert resp.get_json()["revoked_at"] is not None


def test_accept_invitation_creates_user(client, admin_client):
    create = admin_client.post(
        "/api/v1/invitations",
        json={
            "email": "fresh@acme.io",
            "full_name": "Fresh User",
            "role_codes": ["tech"],
        },
    )
    body = create.get_json()
    token = body["token"]

    resp = client.post(
        "/api/v1/invitations/accept",
        json={
            "token": token,
            "full_name": "Fresh Field Tech",
            "password": "AcceptedPassword1!",
        },
    )
    assert resp.status_code == 201, resp.get_json()
    body2 = resp.get_json()
    assert body2["ok"] is True
    assert body2["email"] == "fresh@acme.io"
    assert body2["tenant_slug"] == "acme"

    g.skip_tenant_filter = True
    user = db.session.scalar(db.select(User).where(User.email == "fresh@acme.io"))
    assert user is not None
    assert {r.code for r in user.roles} == {"tech"}


def test_accept_with_bad_token_returns_422(client):
    resp = client.post(
        "/api/v1/invitations/accept",
        json={
            "token": "x" * 50,
            "full_name": "X",
            "password": "AcceptedPassword1!",
        },
    )
    assert resp.status_code == 422
    assert resp.get_json()["error"]["code"] == "bad_token"


def test_accept_expired_token_returns_422(client, admin_client, tenant):
    create = admin_client.post(
        "/api/v1/invitations",
        json={"email": "expired@acme.io", "role_codes": []},
    )
    token = create.get_json()["token"]

    g.skip_tenant_filter = True
    inv = db.session.scalar(db.select(Invitation).where(Invitation.email == "expired@acme.io"))
    inv.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db.session.commit()

    resp = client.post(
        "/api/v1/invitations/accept",
        json={
            "token": token,
            "full_name": "X",
            "password": "AcceptedPassword1!",
        },
    )
    assert resp.status_code == 422
    assert resp.get_json()["error"]["code"] == "expired_token"


def test_accept_revoked_token_returns_422(client, admin_client):
    create = admin_client.post(
        "/api/v1/invitations",
        json={"email": "rev@acme.io", "role_codes": []},
    )
    inv_id = create.get_json()["invitation"]["id"]
    token = create.get_json()["token"]

    admin_client.delete(f"/api/v1/invitations/{inv_id}")

    resp = client.post(
        "/api/v1/invitations/accept",
        json={
            "token": token,
            "full_name": "X",
            "password": "AcceptedPassword1!",
        },
    )
    assert resp.status_code == 422
    assert resp.get_json()["error"]["code"] == "bad_token"


def test_accept_token_is_one_shot(client, admin_client):
    create = admin_client.post(
        "/api/v1/invitations",
        json={"email": "once@acme.io", "role_codes": []},
    )
    token = create.get_json()["token"]
    first = client.post(
        "/api/v1/invitations/accept",
        json={
            "token": token,
            "full_name": "First",
            "password": "AcceptedPassword1!",
        },
    )
    assert first.status_code == 201

    second = client.post(
        "/api/v1/invitations/accept",
        json={
            "token": token,
            "full_name": "Second",
            "password": "AcceptedPassword1!",
        },
    )
    assert second.status_code == 422
    assert second.get_json()["error"]["code"] == "bad_token"
