"""Operator overview endpoint."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta


def _create_wo(client, **overrides) -> dict:
    """The model defaults `status="draft"`, but the operator load only
    counts work that's actually been opened — pass status=open by
    default so tests count what they expect."""
    body = {
        "type": "reactive",
        "category": "investigation",
        "priority": "normal",
        "title": "test",
        "status": "open",
        **overrides,
    }
    resp = client.post("/api/v1/work-orders", json=body)
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()


def test_operator_load_lists_active_operators(supervisor_client, tech_user, supervisor_user):
    resp = supervisor_client.get("/api/v1/operators/load")
    assert resp.status_code == 200, resp.get_json()
    body = resp.get_json()
    user_ids = {row["user_id"] for row in body["items"]}
    assert tech_user.id in user_ids
    assert supervisor_user.id in user_ids


def test_operator_load_counts_open_and_in_progress(
    admin_client, supervisor_client, tech_user
):
    """Two WOs assigned to the tech: one open, one transitioned to in_progress."""
    wo1 = _create_wo(admin_client, title="open WO", assigned_to=tech_user.id)
    wo2 = _create_wo(admin_client, title="active WO", assigned_to=tech_user.id)
    # State machine: open → assigned → in_progress.
    admin_client.post(
        f"/api/v1/work-orders/{wo2['wo_number']}/transition",
        json={"to": "assigned"},
    )
    admin_client.post(
        f"/api/v1/work-orders/{wo2['wo_number']}/transition",
        json={"to": "in_progress"},
    )

    resp = supervisor_client.get("/api/v1/operators/load")
    row = next(r for r in resp.get_json()["items"] if r["user_id"] == tech_user.id)
    assert row["open_wos"] == 1, row
    assert row["in_progress_wos"] == 1, row


def test_operator_load_counts_overdue(admin_client, supervisor_client, tech_user):
    yesterday = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    _create_wo(
        admin_client,
        title="late WO",
        assigned_to=tech_user.id,
        due_by=yesterday,
    )
    resp = supervisor_client.get("/api/v1/operators/load")
    row = next(r for r in resp.get_json()["items"] if r["user_id"] == tech_user.id)
    assert row["overdue_wos"] == 1, row


def test_operator_load_surfaces_today_areas(
    supervisor_client, admin_client, tech_user
):
    """Pre-existing test_daily_assignments fixture builds the area + roster.
    Inline a minimal version: roster the tech to a fresh area today."""
    # Build a service area + assignment via the API.
    from flask import g
    from app.extensions import db
    from app.models import ServiceArea
    from app.services.geometry import geojson_to_wkb

    g.skip_tenant_filter = True
    area = ServiceArea(
        tenant_id=tech_user.tenant_id,
        code="TEST-OP",
        name="Operators test area",
        kind="maintenance",
        geom=geojson_to_wkb(
            {
                "type": "MultiPolygon",
                "coordinates": [[[
                    [-77.0, 38.0],
                    [-76.0, 38.0],
                    [-76.0, 39.0],
                    [-77.0, 39.0],
                    [-77.0, 38.0],
                ]]],
            }
        ),
        color="#3b82f6",
    )
    db.session.add(area)
    db.session.commit()

    today = date.today().isoformat()
    supervisor_client.post(
        "/api/v1/daily-assignments",
        json={"user_id": tech_user.id, "area_id": area.id, "on_date": today, "priority": 1},
    )

    resp = supervisor_client.get(f"/api/v1/operators/load?on_date={today}")
    row = next(r for r in resp.get_json()["items"] if r["user_id"] == tech_user.id)
    assert len(row["today_areas"]) == 1
    assert row["today_areas"][0]["code"] == "TEST-OP"


def test_operator_load_requires_supervisor(tech_client):
    resp = tech_client.get("/api/v1/operators/load")
    # tech is not in (admin, supervisor); must be 403.
    assert resp.status_code == 403


def test_operator_load_emergency_first(admin_client, supervisor_client, tech_user, supervisor_user):
    """Operator with an emergency WO must sort above one without."""
    _create_wo(
        admin_client,
        title="emergency",
        priority="emergency",
        assigned_to=tech_user.id,
    )
    _create_wo(admin_client, title="normal", assigned_to=supervisor_user.id)

    resp = supervisor_client.get("/api/v1/operators/load")
    items = resp.get_json()["items"]
    user_ids_in_order = [i["user_id"] for i in items]
    assert user_ids_in_order.index(tech_user.id) < user_ids_in_order.index(
        supervisor_user.id
    )
