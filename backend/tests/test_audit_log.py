from __future__ import annotations

from sqlalchemy import select

from app.extensions import db
from app.models import AuditLog
from tests.conftest import DEFAULT_PASSWORD


def _audit_actions(tenant_id: int | None = None) -> list[str]:
    stmt = select(AuditLog.action).order_by(AuditLog.occurred_at)
    if tenant_id is not None:
        stmt = stmt.where(AuditLog.tenant_id == tenant_id)
    return [row for row in db.session.scalars(stmt).all()]


def test_register_tenant_emits_audit(client):
    client.post(
        "/api/v1/auth/register-tenant",
        json={
            "tenant_name": "Acme",
            "slug": "acme",
            "admin_email": "admin@acme.io",
            "admin_password": "VeryStrongP@ss123",
            "full_name": "Admin",
        },
    )
    actions = _audit_actions()
    assert "register_tenant" in actions
    # Tenant + Role + User + UserRole creates fire via the flush listener
    assert "create" in actions


def test_login_emits_audit(client, admin_user, tenant):
    client.post(
        "/api/v1/auth/login",
        json={
            "tenant_slug": "acme",
            "email": "admin@acme.io",
            "password": DEFAULT_PASSWORD,
        },
    )
    actions = _audit_actions(tenant_id=tenant.id)
    assert "login" in actions


def test_failed_login_emits_audit(client, admin_user, tenant):
    client.post(
        "/api/v1/auth/login",
        json={
            "tenant_slug": "acme",
            "email": "admin@acme.io",
            "password": "wrong",
        },
    )
    actions = _audit_actions(tenant_id=tenant.id)
    assert "login_failed" in actions


def test_logout_emits_audit(admin_client, tenant):
    admin_client.post("/api/v1/auth/logout")
    actions = _audit_actions(tenant_id=tenant.id)
    assert "logout" in actions


def test_user_create_emits_create_audit(admin_client, tenant):
    admin_client.post(
        "/api/v1/users",
        json={
            "email": "audit@acme.io",
            "full_name": "Audited User",
            "password": "AnotherStrongP@ss",
        },
    )
    rows = db.session.scalars(
        select(AuditLog).where(
            AuditLog.tenant_id == tenant.id,
            AuditLog.entity_type == "User",
            AuditLog.action == "create",
        )
    ).all()
    assert any(r.after and r.after.get("email") == "audit@acme.io" for r in rows)


def test_password_hash_never_in_audit(admin_client):
    admin_client.post(
        "/api/v1/users",
        json={
            "email": "secrets@acme.io",
            "full_name": "Has Secrets",
            "password": "AnotherStrongP@ss",
        },
    )
    rows = db.session.scalars(select(AuditLog).where(AuditLog.entity_type == "User")).all()
    for r in rows:
        if r.after:
            assert "password_hash" not in r.after
        if r.before:
            assert "password_hash" not in r.before
