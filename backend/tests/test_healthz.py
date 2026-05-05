from __future__ import annotations


def test_healthz_returns_db_ok(client):
    resp = client.get("/healthz")
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["db"] == "ok"
    assert body["version"] == "test-sha"
