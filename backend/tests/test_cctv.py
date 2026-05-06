from __future__ import annotations

import io
import json
from datetime import UTC, datetime

NOW_ISO = datetime.now(UTC).isoformat()


def _create_cctv(client, **overrides):
    payload = {
        "kind": "cctv",
        "performed_at": NOW_ISO,
        "data": {
            "standard": "PACP",
            "version": "7.0",
            "upstream_mh": "MH-A",
            "downstream_mh": "MH-B",
            "direction": "upstream",
            "length_surveyed_m": "92.0",
            "observations": [
                {"distance_m": "12.4", "code": "CC", "remarks": "circ crack"},
            ],
        },
    }
    payload.update(overrides)
    return client.post("/api/v1/inspections", json=payload)


def test_pacp_codes_seeded(admin_client):
    resp = admin_client.get("/api/v1/pacp-codes")
    assert resp.status_code == 200
    body = resp.get_json()
    assert len(body) >= 30
    codes = {c["code"] for c in body}
    assert {"CC", "CL", "FC", "B", "H", "IR", "IS", "RFC"}.issubset(codes)


def test_pacp_codes_filter_by_group(admin_client):
    body = admin_client.get("/api/v1/pacp-codes?group=structural").get_json()
    assert all(c["group"] == "structural" for c in body)


def test_create_cctv_happy(admin_client):
    resp = _create_cctv(admin_client)
    assert resp.status_code == 201, resp.get_json()
    body = resp.get_json()
    assert body["kind"] == "cctv"
    assert body["data"]["standard"] == "PACP"
    assert len(body["data"]["observations"]) == 1
    assert body["data"]["observations"][0]["code"] == "CC"


def test_create_cctv_unknown_code_422(admin_client):
    resp = _create_cctv(
        admin_client,
        data={
            "standard": "PACP",
            "version": "7.0",
            "length_surveyed_m": "50",
            "observations": [{"distance_m": "10", "code": "ZZ_FAKE"}],
        },
    )
    assert resp.status_code == 422
    assert resp.get_json()["error"]["code"] == "unknown_pacp_code"


def test_create_cctv_distance_exceeds_length_422(admin_client):
    resp = _create_cctv(
        admin_client,
        data={
            "standard": "PACP",
            "version": "7.0",
            "length_surveyed_m": "50",
            "observations": [{"distance_m": "200", "code": "CC"}],
        },
    )
    assert resp.status_code == 422
    assert resp.get_json()["error"]["code"] == "distance_exceeds_length"


def test_cctv_no_observations_allowed(admin_client):
    resp = _create_cctv(
        admin_client,
        data={"standard": "PACP", "version": "7.0", "observations": []},
    )
    assert resp.status_code == 201


def test_import_pacp_json(admin_client):
    payload = {
        "standard": "PACP",
        "version": "7.0",
        "upstream_mh": "MH-J1",
        "downstream_mh": "MH-J2",
        "direction": "upstream",
        "length_surveyed_m": "100",
        "observations": [
            {"distance_m": "5", "code": "CC", "remarks": "from import"},
            {"distance_m": "75", "code": "FC", "joint": True},
        ],
    }
    resp = admin_client.post(
        "/api/v1/inspections/import-pacp",
        data={"file": (io.BytesIO(json.dumps(payload).encode("utf-8")), "in.json")},
        content_type="multipart/form-data",
    )
    assert resp.status_code == 201, resp.get_json()
    body = resp.get_json()
    assert body["kind"] == "cctv"
    assert len(body["data"]["observations"]) == 2


def test_import_pacp_xml_basic(admin_client):
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<Section>
  <Standard>PACP</Standard>
  <Version>7.0</Version>
  <UpstreamMH>MH-X1</UpstreamMH>
  <DownstreamMH>MH-X2</DownstreamMH>
  <Direction>downstream</Direction>
  <LengthSurveyed>120</LengthSurveyed>
  <Observations>
    <Observation>
      <Distance>10</Distance>
      <Code>CC</Code>
      <Remarks>from xml</Remarks>
    </Observation>
    <Observation>
      <Distance>50</Distance>
      <Code>FL</Code>
      <ClockFrom>10</ClockFrom>
      <ClockTo>2</ClockTo>
    </Observation>
  </Observations>
</Section>
"""
    resp = admin_client.post(
        "/api/v1/inspections/import-pacp",
        data={"file": (io.BytesIO(xml.encode("utf-8")), "survey.xml")},
        content_type="multipart/form-data",
    )
    assert resp.status_code == 201, resp.get_json()
    body = resp.get_json()
    obs = body["data"]["observations"]
    assert len(obs) == 2
    codes = {o["code"] for o in obs}
    assert {"CC", "FL"}.issubset(codes)


def test_import_pacp_xml_unknown_code_422(admin_client):
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<Section>
  <Standard>PACP</Standard>
  <Version>7.0</Version>
  <LengthSurveyed>50</LengthSurveyed>
  <Observations>
    <Observation><Distance>5</Distance><Code>ZZ_NOPE</Code></Observation>
  </Observations>
</Section>
"""
    resp = admin_client.post(
        "/api/v1/inspections/import-pacp",
        data={"file": (io.BytesIO(xml.encode("utf-8")), "x.xml")},
        content_type="multipart/form-data",
    )
    assert resp.status_code == 422
    assert resp.get_json()["error"]["code"] == "unknown_pacp_code"


def test_import_pacp_empty_file_422(admin_client):
    resp = admin_client.post(
        "/api/v1/inspections/import-pacp",
        data={"file": (io.BytesIO(b""), "empty.xml")},
        content_type="multipart/form-data",
    )
    assert resp.status_code == 422


def test_import_pacp_unauthenticated_401(client):
    resp = client.post(
        "/api/v1/inspections/import-pacp",
        data={"file": (io.BytesIO(b"<x/>"), "x.xml")},
        content_type="multipart/form-data",
    )
    assert resp.status_code == 401


def test_pacp_codes_unauthenticated_401(client):
    resp = client.get("/api/v1/pacp-codes")
    assert resp.status_code == 401


def test_cctv_csv_export(admin_client):
    _create_cctv(admin_client)
    resp = admin_client.get("/api/v1/inspections/export?format=csv&kind=cctv")
    assert resp.status_code == 200
    assert resp.mimetype == "text/csv"
