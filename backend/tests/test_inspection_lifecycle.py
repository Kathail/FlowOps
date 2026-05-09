"""Inspection lifecycle: submitted → approved → reopened.

Mirrors the WO reopen test pattern. Approval is admin/supervisor;
reopen (approved → submitted) is admin only. Approved inspections
reject PATCH edits with `approved_locked` until reopened.
"""

from __future__ import annotations

from datetime import UTC, datetime

from app.extensions import db
from tests.conftest import make_asset


NOW_ISO = datetime.now(UTC).isoformat()


def _create_simple(client) -> dict:
    """A minimum valve_exercise inspection so the fixture's data
    schema doesn't gate behaviour we want to test."""
    resp = client.post(
        "/api/v1/inspections",
        json={
            "kind": "valve_exercise",
            "performed_at": NOW_ISO,
            "data": {"turns_to_close": 12, "operates": True},
        },
    )
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()


def test_new_inspection_starts_submitted(admin_client, tenant):
    body = _create_simple(admin_client)
    assert body["status"] == "submitted"


def test_supervisor_can_approve(supervisor_client, tenant):
    body = _create_simple(supervisor_client)
    n = body["inspection_number"]
    resp = supervisor_client.post(
        f"/api/v1/inspections/{n}/transition", json={"to": "approved"}
    )
    assert resp.status_code == 200, resp.get_json()
    assert resp.get_json()["status"] == "approved"


def test_tech_cannot_approve(tech_client, tenant):
    body = _create_simple(tech_client)
    n = body["inspection_number"]
    resp = tech_client.post(
        f"/api/v1/inspections/{n}/transition", json={"to": "approved"}
    )
    assert resp.status_code == 403


def test_approved_inspection_blocks_patch(admin_client, tenant):
    body = _create_simple(admin_client)
    n = body["inspection_number"]
    admin_client.post(f"/api/v1/inspections/{n}/transition", json={"to": "approved"})

    resp = admin_client.patch(
        f"/api/v1/inspections/{n}", json={"notes": "amend after sign-off"}
    )
    assert resp.status_code == 409, resp.get_json()
    assert resp.get_json()["error"]["code"] == "approved_locked"


def test_admin_can_reopen_approved(admin_client, tenant):
    body = _create_simple(admin_client)
    n = body["inspection_number"]
    admin_client.post(f"/api/v1/inspections/{n}/transition", json={"to": "approved"})

    resp = admin_client.post(
        f"/api/v1/inspections/{n}/transition", json={"to": "submitted"}
    )
    assert resp.status_code == 200, resp.get_json()
    assert resp.get_json()["status"] == "submitted"
    # And now PATCH lands again.
    patch = admin_client.patch(
        f"/api/v1/inspections/{n}", json={"notes": "now it can change"}
    )
    assert patch.status_code == 200, patch.get_json()
    assert patch.get_json()["notes"] == "now it can change"


def test_supervisor_cannot_reopen_approved(supervisor_client, tenant):
    body = _create_simple(supervisor_client)
    n = body["inspection_number"]
    supervisor_client.post(
        f"/api/v1/inspections/{n}/transition", json={"to": "approved"}
    )
    resp = supervisor_client.post(
        f"/api/v1/inspections/{n}/transition", json={"to": "submitted"}
    )
    assert resp.status_code == 409, resp.get_json()
    assert resp.get_json()["error"]["code"] == "reopen_requires_admin"


def test_bad_transition_rejected(admin_client, tenant):
    """submitted → submitted, etc. The state-machine table says no."""
    body = _create_simple(admin_client)
    n = body["inspection_number"]
    resp = admin_client.post(
        f"/api/v1/inspections/{n}/transition", json={"to": "submitted"}
    )
    assert resp.status_code == 409
    assert resp.get_json()["error"]["code"] == "bad_transition"
