"""Bulk SR dispatch — supervisor multi-selects SRs and dispatches all
in one request, with shared WO defaults and per-SR auto-routing."""

from __future__ import annotations

from datetime import date

import pytest
from flask import g

from app.extensions import db
from app.models import ServiceArea
from app.services.geometry import geojson_to_wkb


def _create_sr(client, **overrides) -> str:
    body = {
        "category": "low_pressure",
        "domain": "water",
        "priority": "normal",
        "caller_name": "Jane",
        "reported_address": "123 Main",
        "description": "no water",
    }
    body.update(overrides)
    resp = client.post("/api/v1/service-requests", json=body)
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()["service_request"]["sr_number"]


def test_bulk_dispatch_creates_one_wo_per_sr(admin_client, supervisor_client):
    sr1 = _create_sr(admin_client, description="leak at 5th and main")
    sr2 = _create_sr(admin_client, description="hydrant frozen on cedar")
    resp = supervisor_client.post(
        "/api/v1/service-requests/bulk-dispatch",
        json={
            "sr_numbers": [sr1, sr2],
            "defaults": {"category": "investigation"},
        },
    )
    assert resp.status_code == 200, resp.get_json()
    body = resp.get_json()
    assert len(body["dispatched"]) == 2
    assert body["skipped"] == []
    # Title is auto-generated per SR — different for each.
    titles = []
    for row in body["dispatched"]:
        wo = admin_client.get(f"/api/v1/work-orders/{row['wo_number']}").get_json()
        titles.append(wo["title"])
    assert titles[0] != titles[1]
    assert sr1 in titles[0]
    assert sr2 in titles[1]


def test_bulk_dispatch_skips_already_dispatched(admin_client, supervisor_client):
    """An SR that's been dispatched (or closed) is reported as skipped
    rather than failing the whole batch."""
    sr1 = _create_sr(admin_client)
    # Dispatch sr1 individually first.
    admin_client.post(
        f"/api/v1/service-requests/{sr1}/dispatch",
        json={"work_order": {"title": "individual", "category": "investigation"}},
    )
    sr2 = _create_sr(admin_client)
    resp = supervisor_client.post(
        "/api/v1/service-requests/bulk-dispatch",
        json={"sr_numbers": [sr1, sr2]},
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert len(body["dispatched"]) == 1
    assert body["dispatched"][0]["sr_number"] == sr2
    assert len(body["skipped"]) == 1
    assert body["skipped"][0]["sr_number"] == sr1
    assert body["skipped"][0]["reason"] == "already_dispatched"


def test_bulk_dispatch_priority_floor(admin_client, supervisor_client):
    """Bulk default priority is a floor — it never downgrades a higher-
    severity SR. emergency-priority SRs survive a 'normal' default."""
    emergency_sr = _create_sr(admin_client, priority="emergency", description="major break")
    low_sr = _create_sr(admin_client, priority="low", description="small drip")
    resp = supervisor_client.post(
        "/api/v1/service-requests/bulk-dispatch",
        json={
            "sr_numbers": [emergency_sr, low_sr],
            "defaults": {"priority": "normal"},
        },
    )
    body = resp.get_json()
    by_sr = {r["sr_number"]: r for r in body["dispatched"]}

    # emergency SR keeps priority=emergency
    em_wo = admin_client.get(
        f"/api/v1/work-orders/{by_sr[emergency_sr]['wo_number']}"
    ).get_json()
    assert em_wo["priority"] == "emergency"
    # low SR is bumped to normal
    low_wo = admin_client.get(
        f"/api/v1/work-orders/{by_sr[low_sr]['wo_number']}"
    ).get_json()
    assert low_wo["priority"] == "normal"


def test_bulk_dispatch_explicit_assignee_overrides_routing(
    admin_client, supervisor_client, tech_user
):
    """When defaults.assigned_to is set, every WO gets that assignee
    regardless of territory routing."""
    sr1 = _create_sr(admin_client)
    sr2 = _create_sr(admin_client)
    resp = supervisor_client.post(
        "/api/v1/service-requests/bulk-dispatch",
        json={
            "sr_numbers": [sr1, sr2],
            "defaults": {"category": "investigation", "assigned_to": tech_user.id},
        },
    )
    body = resp.get_json()
    for row in body["dispatched"]:
        assert row["assigned_to"] == tech_user.id


def test_bulk_dispatch_auto_routes_per_sr(
    admin_client, supervisor_client, tech_user, tenant
):
    """Without explicit assignee, each SR's location runs through
    territory routing independently."""
    g.skip_tenant_filter = True
    area = ServiceArea(
        tenant_id=tenant.id,
        code="TEST-BULK",
        name="Bulk test area",
        kind="maintenance",
        geom=geojson_to_wkb({
            "type": "MultiPolygon",
            "coordinates": [[[
                [-77.0, 38.0], [-76.0, 38.0], [-76.0, 39.0],
                [-77.0, 39.0], [-77.0, 38.0],
            ]]],
        }),
        color="#3b82f6",
    )
    db.session.add(area)
    db.session.commit()

    today = date.today().isoformat()
    supervisor_client.post(
        "/api/v1/daily-assignments",
        json={"user_id": tech_user.id, "area_id": area.id, "on_date": today, "priority": 1},
    )
    sr_inside = _create_sr(
        admin_client,
        description="inside area",
        location={"type": "Point", "coordinates": [-76.5, 38.5]},
    )
    sr_outside = _create_sr(
        admin_client,
        description="outside area",
        location={"type": "Point", "coordinates": [-78.0, 40.0]},
    )
    resp = supervisor_client.post(
        "/api/v1/service-requests/bulk-dispatch",
        json={"sr_numbers": [sr_inside, sr_outside]},
    )
    body = resp.get_json()
    by_sr = {r["sr_number"]: r for r in body["dispatched"]}
    assert by_sr[sr_inside]["assigned_to"] == tech_user.id
    assert by_sr[sr_outside]["assigned_to"] is None


def test_bulk_dispatch_rejects_cross_tenant_assignee(admin_client, supervisor_client):
    """defaults.assigned_to must be a user in this tenant."""
    from app.models import Tenant, User
    from app.services.auth import hash_password
    from app.utils.uids import generate_user_uid

    g.skip_tenant_filter = True
    other = Tenant(name="Other", slug="other-bulk", settings={})
    db.session.add(other)
    db.session.flush()
    other_user = User(
        tenant_id=other.id,
        user_uid=generate_user_uid(),
        email="x@other-bulk.io",
        password_hash=hash_password("TestPassword123!"),
        full_name="X",
        is_active=True,
    )
    db.session.add(other_user)
    db.session.commit()

    sr1 = _create_sr(admin_client)
    resp = supervisor_client.post(
        "/api/v1/service-requests/bulk-dispatch",
        json={"sr_numbers": [sr1], "defaults": {"assigned_to": other_user.id}},
    )
    assert resp.status_code == 422, resp.get_json()
    assert resp.get_json()["error"]["code"] == "unknown_assignee"


def test_bulk_dispatch_role_gate(tech_client):
    resp = tech_client.post(
        "/api/v1/service-requests/bulk-dispatch", json={"sr_numbers": ["SR-1"]}
    )
    assert resp.status_code == 403


def test_bulk_dispatch_unknown_sr_skipped(admin_client, supervisor_client):
    """Mix valid + missing SR numbers; valid one dispatches, missing
    one shows as skipped. The whole batch doesn't fail."""
    sr1 = _create_sr(admin_client)
    resp = supervisor_client.post(
        "/api/v1/service-requests/bulk-dispatch",
        json={"sr_numbers": [sr1, "SR-9999-NOPE"]},
    )
    assert resp.status_code == 200, resp.get_json()
    body = resp.get_json()
    assert len(body["dispatched"]) == 1
    assert body["dispatched"][0]["sr_number"] == sr1
    assert len(body["skipped"]) == 1
    assert body["skipped"][0]["sr_number"] == "SR-9999-NOPE"
    assert body["skipped"][0]["reason"] == "not_found"


def test_bulk_dispatch_empty_list_rejected(supervisor_client):
    resp = supervisor_client.post(
        "/api/v1/service-requests/bulk-dispatch", json={"sr_numbers": []}
    )
    assert resp.status_code == 422
