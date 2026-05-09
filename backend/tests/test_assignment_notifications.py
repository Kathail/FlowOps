"""Operator profile + assignment-notification tests.

The email driver is monkeypatched at `app.services.email._driver` so
each test inspects exactly what the notification layer would have sent
without needing a working SMTP path. The factory rather than the
StdoutDriver is patched because `app/logging.py` clears root handlers
on app boot, which evicts pytest's caplog handler — so log-based
assertions are unreliable in the Flask app context.
"""

from __future__ import annotations

from typing import Any

import pytest

from app.services import email as email_service


class _RecordingDriver:
    def __init__(self) -> None:
        self.sent: list[dict[str, Any]] = []

    def send(self, *, to: str, subject: str, html: str, text: str) -> None:
        self.sent.append({"to": to, "subject": subject, "html": html, "text": text})


@pytest.fixture
def recording_driver(monkeypatch):
    rec = _RecordingDriver()
    monkeypatch.setattr(email_service, "_driver", lambda: rec)
    return rec


def _recipients(rec: _RecordingDriver) -> list[str]:
    return [m["to"] for m in rec.sent]


def test_create_wo_with_explicit_assignee_emails_them(
    admin_client, tech_user, recording_driver
):
    resp = admin_client.post(
        "/api/v1/work-orders",
        json={
            "type": "reactive",
            "category": "investigation",
            "priority": "normal",
            "title": "Check valve",
            "assigned_to": tech_user.id,
        },
    )
    assert resp.status_code == 201, resp.get_json()
    assert "tech@acme.io" in _recipients(recording_driver)
    body = recording_driver.sent[0]
    assert body["subject"].startswith("[NORMAL] WO ")
    assert "Check valve" in body["text"]


def test_create_wo_without_assignee_does_not_email(
    admin_client, tech_user, recording_driver
):
    """No assigned_to and no roster — no email."""
    resp = admin_client.post(
        "/api/v1/work-orders",
        json={
            "type": "reactive",
            "category": "investigation",
            "priority": "normal",
            "title": "Investigate",
        },
    )
    assert resp.status_code == 201, resp.get_json()
    assert recording_driver.sent == []


def test_patch_wo_assigning_a_new_user_emails_them(
    admin_client, tech_user, recording_driver
):
    create = admin_client.post(
        "/api/v1/work-orders",
        json={
            "type": "reactive",
            "category": "investigation",
            "priority": "normal",
            "title": "Check valve",
        },
    )
    wo_number = create.get_json()["wo_number"]
    recording_driver.sent.clear()

    resp = admin_client.patch(
        f"/api/v1/work-orders/{wo_number}",
        json={"assigned_to": tech_user.id},
    )
    assert resp.status_code == 200, resp.get_json()
    assert "tech@acme.io" in _recipients(recording_driver)


def test_patch_wo_with_unchanged_assignee_does_not_re_email(
    admin_client, tech_user, recording_driver
):
    """Re-saving the WO with the same assignee must not spam the operator."""
    create = admin_client.post(
        "/api/v1/work-orders",
        json={
            "type": "reactive",
            "category": "investigation",
            "priority": "normal",
            "title": "Check valve",
            "assigned_to": tech_user.id,
        },
    )
    wo_number = create.get_json()["wo_number"]
    recording_driver.sent.clear()

    resp = admin_client.patch(
        f"/api/v1/work-orders/{wo_number}",
        json={"assigned_to": tech_user.id, "title": "Check valve again"},
    )
    assert resp.status_code == 200
    assert recording_driver.sent == []


def test_opted_out_user_is_not_emailed(
    admin_client, tech_user, recording_driver
):
    """notify_on_assignment=False → the email is suppressed."""
    resp = admin_client.patch(
        f"/api/v1/users/{tech_user.user_uid}",
        json={"notify_on_assignment": False},
    )
    assert resp.status_code == 200, resp.get_json()
    recording_driver.sent.clear()

    create = admin_client.post(
        "/api/v1/work-orders",
        json={
            "type": "reactive",
            "category": "investigation",
            "priority": "normal",
            "title": "Check valve",
            "assigned_to": tech_user.id,
        },
    )
    assert create.status_code == 201
    assert recording_driver.sent == []


def test_inactive_user_is_not_emailed(
    admin_client, tech_user, recording_driver
):
    admin_client.patch(
        f"/api/v1/users/{tech_user.user_uid}",
        json={"is_active": False},
    )
    recording_driver.sent.clear()

    create = admin_client.post(
        "/api/v1/work-orders",
        json={
            "type": "reactive",
            "category": "investigation",
            "priority": "normal",
            "title": "Check valve",
            "assigned_to": tech_user.id,
        },
    )
    assert create.status_code == 201
    assert recording_driver.sent == []


def test_create_wo_rejects_cross_tenant_assignee(admin_client, app, recording_driver):
    """Regression: the WO create path used to write `assigned_to` raw,
    so an admin (or buggy frontend) could assign a WO to a user in
    another tenant. The notification service would then email them
    with the WO number + title + tenant name. Now it 400s instead."""
    from flask import g
    from app.extensions import db
    from app.models import Tenant, User
    from app.services.auth import hash_password
    from app.utils.uids import generate_user_uid

    g.skip_tenant_filter = True
    other_tenant = Tenant(name="Other", slug="other", settings={})
    db.session.add(other_tenant)
    db.session.flush()
    other_user = User(
        tenant_id=other_tenant.id,
        user_uid=generate_user_uid(),
        email="cross@other.io",
        password_hash=hash_password("TestPassword123!"),
        full_name="Cross Tenant User",
        is_active=True,
    )
    db.session.add(other_user)
    db.session.commit()

    resp = admin_client.post(
        "/api/v1/work-orders",
        json={
            "type": "reactive",
            "category": "investigation",
            "priority": "normal",
            "title": "leak attempt",
            "assigned_to": other_user.id,
        },
    )
    # ValidationError → 422 in this app's error mapping.
    assert resp.status_code == 422, resp.get_json()
    assert resp.get_json()["error"]["code"] == "unknown_assignee"
    # And critically: no email to the cross-tenant user.
    assert recording_driver.sent == []


def test_sr_dispatch_emails_assignee(admin_client, tech_user, recording_driver):
    sr = admin_client.post(
        "/api/v1/service-requests",
        json={
            "category": "low_pressure",
            "domain": "water",
            "priority": "normal",
            "caller_name": "Jane",
            "reported_address": "123 Main",
            "description": "no water",
        },
    )
    sr_number = sr.get_json()["service_request"]["sr_number"]
    recording_driver.sent.clear()

    resp = admin_client.post(
        f"/api/v1/service-requests/{sr_number}/dispatch",
        json={
            "work_order": {
                "title": "Investigate",
                "category": "investigation",
                "assigned_to": tech_user.id,
            },
        },
    )
    assert resp.status_code == 200, resp.get_json()
    assert "tech@acme.io" in _recipients(recording_driver)


def test_get_me_returns_self(tech_client):
    resp = tech_client.get("/api/v1/users/me")
    assert resp.status_code == 200, resp.get_json()
    body = resp.get_json()
    assert body["email"] == "tech@acme.io"
    assert body["notify_on_assignment"] is True


def test_patch_me_updates_profile(tech_client):
    resp = tech_client.patch(
        "/api/v1/users/me",
        json={"title": "Field Tech II", "phone": "555-0100", "notify_on_assignment": False},
    )
    assert resp.status_code == 200, resp.get_json()
    body = resp.get_json()
    assert body["title"] == "Field Tech II"
    assert body["phone"] == "555-0100"
    assert body["notify_on_assignment"] is False


def test_patch_me_can_clear_nullable_field_with_explicit_null(tech_client):
    """Regression: an explicit `field: null` in the PATCH body must
    clear the column. Earlier code used `if data.x is not None` which
    conflated "absent" with "explicit null" and silently dropped the
    update — so an operator clearing their phone or default territory
    via the profile UI saw their request succeed but the value stuck."""
    # Set phone first
    set_resp = tech_client.patch("/api/v1/users/me", json={"phone": "555-0100"})
    assert set_resp.status_code == 200
    assert set_resp.get_json()["phone"] == "555-0100"

    # Now clear it with explicit null
    clear_resp = tech_client.patch("/api/v1/users/me", json={"phone": None})
    assert clear_resp.status_code == 200, clear_resp.get_json()
    assert clear_resp.get_json()["phone"] is None

    # Sending the field absent must NOT clear what's there — set again
    # then PATCH a different field, verify phone survives.
    tech_client.patch("/api/v1/users/me", json={"phone": "555-0200"})
    other_resp = tech_client.patch("/api/v1/users/me", json={"title": "Tech II"})
    assert other_resp.get_json()["phone"] == "555-0200"


def test_patch_me_cannot_change_employee_number_or_active(tech_client):
    """Sanity check that the self-update schema doesn't let an operator
    change their employee number or active flag — both would be audit-
    trail / impersonation issues."""
    resp = tech_client.patch(
        "/api/v1/users/me",
        json={
            "title": "Crew Lead",
            "employee_number": "9999",
            "is_active": False,
        },
    )
    assert resp.status_code == 200, resp.get_json()
    body = resp.get_json()
    assert body["title"] == "Crew Lead"
    assert body["is_active"] is True
    assert body["employee_number"] is None
