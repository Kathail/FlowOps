"""Territory routing — pick today's primary operator for a WO/SR.

Given the entity's location (or its asset's geom), this looks up the
service areas that contain it, joins through `daily_assignment` for
today, and returns the primary operator covering any of those areas.

Used as a *default* assignee at create/dispatch time. The dispatcher
can always override; the function returns None when there's no
unambiguous match (no operator on shift, multiple equal-priority
operators across multiple areas) so the dispatch path falls through
to manual selection rather than guessing.
"""

from __future__ import annotations

from datetime import date as Date
from datetime import datetime
from typing import Any

from sqlalchemy import func, select

from app.extensions import db
from app.models import Asset, DailyAssignment, ServiceArea, User


def _containing_area_ids(
    *, tenant_id: int, location: Any, asset_id: int | None
) -> list[int]:
    """Service-area IDs whose polygons contain the entity's geometry.

    Mirrors `areas_for_wo_or_sr` selection logic but returns just IDs —
    we don't need the full serialized rows here. Tenant filter is
    applied explicitly so this is safe outside a request context.
    """
    if location is not None:
        rows = db.session.scalars(
            select(ServiceArea.id).where(
                ServiceArea.tenant_id == tenant_id,
                func.ST_Contains(ServiceArea.geom, location),
            )
        ).all()
        return list(rows)
    if asset_id is not None:
        rows = db.session.scalars(
            select(ServiceArea.id)
            .join(Asset, func.ST_Intersects(ServiceArea.geom, Asset.geom))
            .where(
                ServiceArea.tenant_id == tenant_id,
                Asset.tenant_id == tenant_id,
                Asset.id == asset_id,
            )
        ).all()
        return list(rows)
    return []


def primary_operator_for(
    *,
    tenant_id: int,
    location: Any,
    asset_id: int | None,
    on_date: Date | None = None,
) -> int | None:
    """Return the user_id of the operator on shift for this entity, or
    None if the routing has no unambiguous default.

    Priority rules:
      1. Lowest `priority` value across all matching assignments wins
         (1 = primary, 2 = backup, etc.).
      2. Ties at the same priority across multiple areas → no default
         (dispatcher picks). Two operators at priority 1 in the same
         area is also a tie; same outcome.

    `on_date` defaults to today.

    `tenant_id` is required and applied as an explicit predicate on
    every query. Defense in depth — the SQLAlchemy session-level
    tenant filter is a no-op when called outside a request context
    (e.g. from a background RQ job), and territory routing is exactly
    the kind of logic that's tempting to extract into a job later. The
    explicit guard means a no-context call returns nothing instead of
    silently leaking rows from another tenant.
    """
    on_date = on_date or datetime.now().date()
    area_ids = _containing_area_ids(
        tenant_id=tenant_id, location=location, asset_id=asset_id
    )
    if not area_ids:
        return None

    rows = db.session.execute(
        select(DailyAssignment.user_id, DailyAssignment.priority)
        .where(
            DailyAssignment.tenant_id == tenant_id,
            DailyAssignment.area_id.in_(area_ids),
            DailyAssignment.on_date == on_date,
        )
        .order_by(DailyAssignment.priority)
    ).all()
    if not rows:
        return None
    top_priority = rows[0].priority
    candidates = {r.user_id for r in rows if r.priority == top_priority}
    if len(candidates) != 1:
        return None
    user_id = candidates.pop()
    # Sanity check: don't auto-assign an inactive operator. select()
    # rather than session.get() so the tenant-filter listener applies
    # (matches the anti-pattern note in service_requests.py::_payload).
    user = db.session.scalar(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    )
    if user is None or not user.is_active:
        return None
    return user_id
