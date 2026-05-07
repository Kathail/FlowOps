from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def _enable_catalog_edits(app):
    """AssetClass is global, so per-tenant edits are disabled by default
    (see app/api/asset_classes.py docstring). Re-enable for these tests
    so we can exercise the patch happy paths; the default-off behaviour
    is covered by test_asset_class_edits_disabled_by_default below."""
    app.config["SETTINGS"].allow_asset_class_edits = True
    yield
    app.config["SETTINGS"].allow_asset_class_edits = False


def test_asset_class_edits_disabled_by_default(app, admin_client):
    app.config["SETTINGS"].allow_asset_class_edits = False
    resp = admin_client.patch(
        "/api/v1/asset-classes/WAT_HYD",
        json={"name": "should fail"},
    )
    assert resp.status_code == 403
    assert resp.get_json()["error"]["code"] == "catalog_edits_disabled"


def test_admin_can_patch_attribute_schema(admin_client):
    new_schema = {
        "type": "object",
        "properties": {
            "color": {"type": "string", "enum": ["red", "yellow"]},
        },
        "required": ["color"],
    }
    resp = admin_client.patch(
        "/api/v1/asset-classes/WAT_HYD",
        json={"attribute_schema": new_schema},
    )
    assert resp.status_code == 200, resp.get_json()
    body = resp.get_json()
    assert body["attribute_schema"]["properties"]["color"]["enum"] == ["red", "yellow"]


def test_invalid_json_schema_returns_422(admin_client):
    # Reference to a non-existent definition is a malformed schema.
    resp = admin_client.patch(
        "/api/v1/asset-classes/WAT_HYD",
        json={"attribute_schema": {"type": "not-a-real-type"}},
    )
    assert resp.status_code == 422
    assert resp.get_json()["error"]["code"] == "bad_schema"


def test_non_admin_cannot_patch(supervisor_client):
    resp = supervisor_client.patch(
        "/api/v1/asset-classes/WAT_HYD",
        json={"name": "Hydrant (custom)"},
    )
    assert resp.status_code == 403


def test_patch_unknown_class_404(admin_client):
    resp = admin_client.patch(
        "/api/v1/asset-classes/NOT_A_CLASS",
        json={"name": "x"},
    )
    assert resp.status_code == 404


def test_patch_cosmetics(admin_client):
    resp = admin_client.patch(
        "/api/v1/asset-classes/WAT_HYD",
        json={"icon": "fire-hydrant", "color": "#ff0000"},
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["icon"] == "fire-hydrant"
    assert body["color"] == "#ff0000"
