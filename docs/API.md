# CityWater API

Live OpenAPI 3.1 spec is generated at runtime: `GET /api/v1/openapi.json`. This document is a high-level catalog of resources and conventions; the spec is the source of truth for request/response shapes.

## Conventions

- **Base path:** `/api/v1`
- **Auth:** session cookie set by `POST /api/v1/auth/login`. CSRF token in the `XSRF-TOKEN` cookie; clients send it back as `X-CSRFToken` on mutating requests. `credentials: include` on every fetch.
- **Tenant scope:** derived from the session, never accepted from the client. URLs use human-readable identifiers (`asset_uid`, `wo_number`, `sr_number`, `inspection_number`) rather than internal integer IDs.
- **Pagination:** list endpoints take `?page=` (1-indexed) and `?page_size=` (default 50, capped at 200). Responses include `total`, `page`, `page_size`, `items`.
- **Errors:** `{ "error": { "code": "<symbolic>", "message": "<human>" } }` with appropriate HTTP status. Never echoes back internal exception text.
- **Soft delete:** `DELETE` on a tenant entity sets `deleted_at`; the row is excluded from subsequent reads.
- **Rate limits:** `/auth/login`, `/auth/register-tenant`, `/auth/password/change`, `/invitations/accept`. Limits are configurable via `RATE_LIMIT_*` env.

## Resource map

| Area | Blueprint | Notable endpoints |
|---|---|---|
| Auth | `/auth` | `POST /login`, `POST /logout`, `GET /me`, `POST /register-tenant`, `POST /password/change` |
| Health | `/healthz`, `/healthz/deep` | Liveness probe + deep readiness (Postgres, PostGIS, Redis) |
| Assets | `/assets`, `/asset-classes` | CRUD on assets, list/edit asset class catalog (catalog edits gated by `ALLOW_ASSET_CLASS_EDITS` env) |
| Work Orders | `/work-orders` | CRUD, transitions, asset attachments, tasks, time logs, materials, attachments, kanban view |
| Inspections | `/inspections` | CRUD, per-kind structured payload (hydrant flow, valve exercise, manhole, catch basin, lift station, CCTV/PACP), CSV export, PACP XML import |
| Service Requests | `/service-requests` | CRUD, dispatch as WO, intake form, duplicate detection |
| Service Areas | `/service-areas` | CRUD on maintenance districts + water/sewer/storm system polygons; `/containing` spatial lookup |
| Schedules | `/schedules` | RRULE-driven recurring task scheduler |
| Comments | `/comments` | Polymorphic comments on WO/SR/Inspection |
| Links | `/links` | Polymorphic entity-to-entity links |
| History | `/history` | Per-entity audit timeline |
| Users + Roles | `/users` | Tenant user management, role assignment |
| Invitations | `/invitations` | Admin-initiated invitations + public accept |
| Reports | `/reports` | Single endpoint with `?type=` (break-history, wo-summary, inspection-summary, age-distribution, condition-criticality) — also CSV/PDF export |
| Tiles | `/tiles/assets/{z}/{x}/{y}.pbf` | Vector tiles for the map (PostGIS MVT) |
| Map overlays | `/map/overlays` | Frontend metadata for layer toggles |
| Task definitions | `/task-definitions` | Tenant-customisable task catalog |
| Admin | `/admin/audit-log` | Read-only audit log for tenant admins |
| OpenAPI | `/openapi.json` | Generated spec |

## Response envelope examples

**List:**
```json
{
  "items": [...],
  "total": 1234,
  "page": 1,
  "page_size": 50
}
```

**Error:**
```json
{ "error": { "code": "not_found", "message": "asset HYD-99999 not found" } }
```

**Auth:**
```json
{
  "user": { "user_uid": "...", "email": "...", "full_name": "...", "roles": [{"code":"admin","name":"Administrator"}] },
  "tenant": { "id": 1, "slug": "acme", "name": "Acme Water", "settings": {} }
}
```
