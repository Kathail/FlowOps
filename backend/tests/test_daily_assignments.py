"""Daily-roster + territory auto-routing tests."""

from __future__ import annotations

from datetime import date

import pytest
from flask import g

from app.extensions import db as _db
from app.models import DailyAssignment, ServiceArea
from app.services.geometry import geojson_to_wkb


def _add_area(tenant, code: str, name: str, polygon_coords) -> ServiceArea:
    """Add a service area whose multipolygon covers `polygon_coords`."""
    g.skip_tenant_filter = True
    geom = geojson_to_wkb(
        {"type": "MultiPolygon", "coordinates": [[polygon_coords]]}
    )
    area = ServiceArea(
        tenant_id=tenant.id,
        code=code,
        name=name,
        kind="maintenance",
        geom=geom,
        color="#3b82f6",
    )
    _db.session.add(area)
    _db.session.flush()
    return area


@pytest.fixture
def north_area(app, tenant):
    """A square covering the (-77, 38) — (-76, 39) region."""
    poly = [
        [-77.0, 38.0],
        [-76.0, 38.0],
        [-76.0, 39.0],
        [-77.0, 39.0],
        [-77.0, 38.0],
    ]
    a = _add_area(tenant, "TEST-N", "North", poly)
    _db.session.commit()
    return a


def test_create_daily_assignment_and_list(supervisor_client, tech_user, north_area):
    today = date.today().isoformat()
    resp = supervisor_client.post(
        "/api/v1/daily-assignments",
        json={
            "user_id": tech_user.id,
            "area_id": north_area.id,
            "on_date": today,
            "priority": 1,
        },
    )
    assert resp.status_code == 201, resp.get_json()
    body = resp.get_json()
    assert body["user_id"] == tech_user.id
    assert body["user_employee_number"] is None  # not set on the test user
    assert body["area_code"] == "TEST-N"

    listing = supervisor_client.get(f"/api/v1/daily-assignments?date={today}").get_json()
    assert len(listing["items"]) == 1
    assert listing["items"][0]["area_id"] == north_area.id


def test_duplicate_assignment_409s(supervisor_client, tech_user, north_area):
    today = date.today().isoformat()
    payload = {
        "user_id": tech_user.id,
        "area_id": north_area.id,
        "on_date": today,
        "priority": 1,
    }
    supervisor_client.post("/api/v1/daily-assignments", json=payload)
    resp = supervisor_client.post("/api/v1/daily-assignments", json=payload)
    assert resp.status_code == 409
    assert resp.get_json()["error"]["code"] == "duplicate_assignment"


def test_tech_cannot_create_or_delete(tech_client, tech_user, north_area):
    today = date.today().isoformat()
    resp = tech_client.post(
        "/api/v1/daily-assignments",
        json={
            "user_id": tech_user.id,
            "area_id": north_area.id,
            "on_date": today,
            "priority": 1,
        },
    )
    # require_roles raises 403 for missing role.
    assert resp.status_code == 403


def test_sr_dispatch_auto_routes_to_today_operator(
    admin_client, supervisor_client, tech_user, north_area
):
    """Create a SR with a location inside the area, with today's tech
    rostered. Dispatch should default `assigned_to` to the tech."""
    today = date.today().isoformat()
    supervisor_client.post(
        "/api/v1/daily-assignments",
        json={
            "user_id": tech_user.id,
            "area_id": north_area.id,
            "on_date": today,
            "priority": 1,
        },
    )

    # Intake the SR with a point inside the polygon (-76.5, 38.5).
    sr_resp = admin_client.post(
        "/api/v1/service-requests",
        json={
            "category": "low_pressure",
            "domain": "water",
            "priority": "normal",
            "caller_name": "Jane",
            "reported_address": "123 Main",
            "location": {"type": "Point", "coordinates": [-76.5, 38.5]},
            "description": "auto-route test",
        },
    )
    assert sr_resp.status_code == 201, sr_resp.get_json()
    sr_number = sr_resp.get_json()["service_request"]["sr_number"]

    # Dispatch without specifying assigned_to — auto-routing should
    # pick today's primary operator.
    dispatch_resp = admin_client.post(
        f"/api/v1/service-requests/{sr_number}/dispatch",
        json={"work_order": {"title": "Investigate", "category": "investigation"}},
    )
    assert dispatch_resp.status_code == 200, dispatch_resp.get_json()
    sr_body = dispatch_resp.get_json()
    wo_number = sr_body["work_order_number"]
    wo_body = admin_client.get(f"/api/v1/work-orders/{wo_number}").get_json()
    assert wo_body["assigned_to"] == tech_user.id


def test_sr_dispatch_no_roster_leaves_unassigned(
    admin_client, north_area
):
    """No daily assignments exist — dispatch leaves the WO unassigned."""
    sr_resp = admin_client.post(
        "/api/v1/service-requests",
        json={
            "category": "low_pressure",
            "domain": "water",
            "priority": "normal",
            "caller_name": "Jane",
            "reported_address": "123 Main",
            "location": {"type": "Point", "coordinates": [-76.5, 38.5]},
            "description": "no-roster test",
        },
    )
    sr_number = sr_resp.get_json()["service_request"]["sr_number"]
    dispatch_resp = admin_client.post(
        f"/api/v1/service-requests/{sr_number}/dispatch",
        json={"work_order": {"title": "Investigate", "category": "investigation"}},
    )
    wo_number = dispatch_resp.get_json()["work_order_number"]
    wo_body = admin_client.get(f"/api/v1/work-orders/{wo_number}").get_json()
    assert wo_body["assigned_to"] is None


def test_sr_dispatch_explicit_assignee_wins(
    admin_client, supervisor_client, admin_user, tech_user, north_area
):
    """When the dispatcher specifies an assignee, auto-routing does not
    override it even if a different operator is rostered."""
    today = date.today().isoformat()
    supervisor_client.post(
        "/api/v1/daily-assignments",
        json={
            "user_id": tech_user.id,
            "area_id": north_area.id,
            "on_date": today,
            "priority": 1,
        },
    )
    sr_resp = admin_client.post(
        "/api/v1/service-requests",
        json={
            "category": "low_pressure",
            "domain": "water",
            "priority": "normal",
            "caller_name": "Jane",
            "reported_address": "123 Main",
            "location": {"type": "Point", "coordinates": [-76.5, 38.5]},
            "description": "override test",
        },
    )
    sr_number = sr_resp.get_json()["service_request"]["sr_number"]
    dispatch_resp = admin_client.post(
        f"/api/v1/service-requests/{sr_number}/dispatch",
        json={
            "work_order": {
                "title": "Investigate",
                "category": "investigation",
                "assigned_to": admin_user.id,
            },
        },
    )
    wo_number = dispatch_resp.get_json()["work_order_number"]
    wo_body = admin_client.get(f"/api/v1/work-orders/{wo_number}").get_json()
    assert wo_body["assigned_to"] == admin_user.id


def test_priority_breaks_ties(
    admin_client, supervisor_client, admin_user, tech_user, north_area
):
    """Two operators on the same area today with different priorities —
    the lower-numbered priority wins."""
    today = date.today().isoformat()
    # tech at priority 2 (backup)
    supervisor_client.post(
        "/api/v1/daily-assignments",
        json={"user_id": tech_user.id, "area_id": north_area.id, "on_date": today, "priority": 2},
    )
    # admin at priority 1 (primary)
    supervisor_client.post(
        "/api/v1/daily-assignments",
        json={"user_id": admin_user.id, "area_id": north_area.id, "on_date": today, "priority": 1},
    )
    sr_resp = admin_client.post(
        "/api/v1/service-requests",
        json={
            "category": "low_pressure",
            "domain": "water",
            "priority": "normal",
            "caller_name": "Jane",
            "reported_address": "123 Main",
            "location": {"type": "Point", "coordinates": [-76.5, 38.5]},
            "description": "priority test",
        },
    )
    sr_number = sr_resp.get_json()["service_request"]["sr_number"]
    dispatch_resp = admin_client.post(
        f"/api/v1/service-requests/{sr_number}/dispatch",
        json={"work_order": {"title": "Investigate", "category": "investigation"}},
    )
    wo_number = dispatch_resp.get_json()["work_order_number"]
    wo_body = admin_client.get(f"/api/v1/work-orders/{wo_number}").get_json()
    assert wo_body["assigned_to"] == admin_user.id  # priority 1 wins
    assert wo_body["assigned_to"] != tech_user.id


def test_assignment_outside_area_unaffected(
    admin_client, supervisor_client, tech_user, north_area
):
    """SR location outside the rostered area → no auto-routing."""
    today = date.today().isoformat()
    supervisor_client.post(
        "/api/v1/daily-assignments",
        json={"user_id": tech_user.id, "area_id": north_area.id, "on_date": today, "priority": 1},
    )
    sr_resp = admin_client.post(
        "/api/v1/service-requests",
        json={
            "category": "low_pressure",
            "domain": "water",
            "priority": "normal",
            "caller_name": "Jane",
            "reported_address": "123 Main",
            "location": {"type": "Point", "coordinates": [-78.0, 40.0]},
            "description": "outside test",
        },
    )
    sr_number = sr_resp.get_json()["service_request"]["sr_number"]
    dispatch_resp = admin_client.post(
        f"/api/v1/service-requests/{sr_number}/dispatch",
        json={"work_order": {"title": "Investigate", "category": "investigation"}},
    )
    wo_number = dispatch_resp.get_json()["work_order_number"]
    wo_body = admin_client.get(f"/api/v1/work-orders/{wo_number}").get_json()
    assert wo_body["assigned_to"] is None
