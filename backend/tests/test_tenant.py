from __future__ import annotations


def test_get_tenant_any_role(tech_client):
    resp = tech_client.get("/api/v1/tenant")
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["slug"] == "acme"


def test_patch_tenant_admin(admin_client):
    resp = admin_client.patch(
        "/api/v1/tenant",
        json={"name": "New Name", "settings": {"locale": "en-US"}},
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["name"] == "New Name"
    assert body["settings"]["locale"] == "en-US"


def test_patch_tenant_non_admin_403(tech_client):
    resp = tech_client.patch("/api/v1/tenant", json={"name": "Nope"})
    assert resp.status_code == 403


def test_patch_tenant_unauthenticated_401(client):
    resp = client.patch("/api/v1/tenant", json={"name": "Nope"})
    assert resp.status_code == 401
