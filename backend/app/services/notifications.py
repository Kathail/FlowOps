"""Operator notifications.

Single channel for now: email the assignee when a work order is assigned
to them. Triggered by:
- WO create with `assigned_to` set (manual or via territory auto-routing).
- WO PATCH that changes `assigned_to` to a different user.
- SR dispatch that creates a WO with `assigned_to` set.

Honoured by:
- `User.notify_on_assignment` (per-operator opt-out).
- `Settings.email_provider` — `stdout` (the default) just logs, so the
  function is always safe to call in dev/tests without provisioning SMTP.

The send is best-effort; a transient driver error must not block the
write that triggered it. Failures are logged at WARNING.
"""

from __future__ import annotations

import logging

from flask import current_app
from markupsafe import escape
from sqlalchemy import select

from app.extensions import db
from app.models import Tenant, User, WorkOrder
from app.services import email as _email_service

logger = logging.getLogger(__name__)


def _build_wo_url(*, tenant_slug: str, wo_number: str) -> str | None:
    """Construct the deep link to the WO. Returns None when
    PUBLIC_BASE_URL is unset; the caller falls back to including just
    the WO number in the body."""
    settings = current_app.config["SETTINGS"]
    base = (settings.public_base_url or "").rstrip("/")
    if not base:
        return None
    return f"{base}/{tenant_slug}/work-orders/{wo_number}"


def notify_work_order_assigned(*, work_order: WorkOrder, assignee_id: int) -> None:
    """Email the operator that they've been assigned a WO.

    Caller passes the *new* assignee's id explicitly so the function
    doesn't have to second-guess "did this change?" — that decision lives
    at the call site (which knows whether this is a create, a PATCH, or
    a dispatch). The function only fans out the channel-specific send.
    """
    # select() rather than session.get() so the tenant-filter listener
    # applies — defense-in-depth even though the call sites now validate
    # assigned_to is in-tenant before the WO is persisted.
    user = db.session.scalar(
        select(User).where(
            User.id == assignee_id,
            User.tenant_id == work_order.tenant_id,
        )
    )
    if user is None or not user.is_active:
        return
    if not user.notify_on_assignment:
        return
    if not user.email:
        # Defensive — User.email is NOT NULL at the schema level, but the
        # check costs nothing and keeps a future "service-account" user
        # type (no email) from blowing up at send time.
        return

    tenant = db.session.scalar(
        select(Tenant).where(Tenant.id == work_order.tenant_id)
    )
    tenant_name = tenant.name if tenant else "CityWater"
    tenant_slug = tenant.slug if tenant else ""

    url = _build_wo_url(tenant_slug=tenant_slug, wo_number=work_order.wo_number)
    priority = (work_order.priority or "normal").upper()
    title = work_order.title or "(no title)"

    subject = f"[{priority}] WO {work_order.wo_number} assigned to you"
    text_lines = [
        f"You've been assigned work order {work_order.wo_number}.",
        "",
        f"Title:    {title}",
        f"Priority: {priority}",
        f"Tenant:   {tenant_name}",
    ]
    if work_order.due_by:
        text_lines.append(f"Due:      {work_order.due_by.isoformat()}")
    if url:
        text_lines += ["", f"Open it: {url}"]
    text = "\n".join(text_lines)

    safe_title = escape(title)
    safe_priority = escape(priority)
    safe_tenant = escape(tenant_name)
    safe_number = escape(work_order.wo_number)
    link_html = (
        f'<p><a href="{escape(url)}">Open work order</a></p>' if url else ""
    )
    html = (
        f"<p>You've been assigned work order <strong>{safe_number}</strong>.</p>"
        f"<ul>"
        f"<li><strong>Title:</strong> {safe_title}</li>"
        f"<li><strong>Priority:</strong> {safe_priority}</li>"
        f"<li><strong>Tenant:</strong> {safe_tenant}</li>"
        f"</ul>"
        f"{link_html}"
    )

    try:
        _email_service._driver().send(to=user.email, subject=subject, html=html, text=text)
    except Exception:
        # Never let a notification failure rollback the surrounding write.
        logger.warning(
            "wo-assignment notification failed wo=%s to=%s",
            work_order.wo_number,
            user.email,
            exc_info=True,
        )
