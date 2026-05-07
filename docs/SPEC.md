# SPEC.md — CityWater v1

Source of truth for what to build. Every PR references a section here.

---

## 1. Product summary

CityWater is an asset management and work management platform for municipal water utilities. It covers three asset domains:

- **Water distribution** (potable water mains, hydrants, valves, services, meters, pumps, reservoirs, PRV stations)
- **Wastewater collection** (gravity mains, force mains, manholes, lift stations, cleanouts, laterals, grease traps)
- **Storm drainage** (storm mains, catch basins, manholes, outfalls, culverts, ditches, BMPs, inlets)

It is a Cityworks alternative for small-to-mid utilities (1–50 users) that cannot justify Cityworks/Esri licensing or operate without ArcGIS as their system of record.

### Differentiation

1. Modern UX. Map-first, mobile-friendly.
2. Flat per-tenant pricing, not per-named-user.
3. Open data formats (GeoJSON, CSV, standard PostGIS).
4. PACP/MACP-native sewer inspection import without a separate add-on.
5. Offline-capable PWA for field crews.

### v1 scope (this document)

- Multi-tenant SaaS
- Asset inventory, all three domains
- Work orders (planned + reactive)
- Inspections (CCTV/PACP, hydrant flow, valve exercising, manhole, catch basin, lift station rounds)
- Service requests (admin intake; public portal is v2)
- Reporting (canned reports + CSV/GeoJSON export)
- Map UI with vector tiles
- Field PWA with offline queue

### Explicitly out of scope for v1

- Public citizen portal
- Native mobile apps
- ArcGIS Server integration
- Hydraulic modelling
- IoT/SCADA telemetry
- Financial/accounting integration
- Customer billing

---

## 2. Personas

| Persona | Role | Primary actions |
|---|---|---|
| **Admin** | IT/GIS coordinator | Tenant config, user management, asset class schemas, imports |
| **Supervisor** | Operations supervisor | Create/assign work orders, review inspections, run reports |
| **Field tech** | Operator/labourer | Receive WOs, complete inspections, log time, attach photos |
| **Read-only** | Engineer/planner | View assets, run reports, export data |
| **Service intake** | Customer service rep | Log service requests, dispatch to supervisor |

Roles are RBAC. Multi-role users are supported. Permissions enforced server-side on every endpoint.

---

## 3. Data model

### 3.1 Identity & tenancy

```
tenant
  id, name, slug, created_at, updated_at
  settings JSONB    -- locale, units, projection, branding

user
  id, tenant_id, user_uid (unique, URL-safe slug),
  email (unique within tenant), password_hash,
  full_name, phone, is_active, last_login_at,
  created_at, updated_at, deleted_at

role
  id, tenant_id, code, name      -- 'admin', 'supervisor', 'tech', 'readonly', 'intake'
  unique (tenant_id, code)

user_role
  user_id, role_id, primary_key (user_id, role_id)
```

`tenant.slug` is the URL prefix for the frontend: `app.citywater.ca/{tenant_slug}/...`.

`user.user_uid` is the URL identifier for users (per CLAUDE.md hard rule #3 — internal `id` is never exposed in routes for tenant data). Generated as a 12-character URL-safe slug.

### 3.2 Asset classes (the spine)

Asset class catalog drives the entire app. Adding a new asset class requires no code changes — it requires a new row and a JSON schema.

```
asset_class
  code            TEXT PRIMARY KEY     -- 'WAT_HYD', 'SAN_MH', 'STM_CB', etc.
  domain          TEXT                  -- 'water', 'sewer', 'storm'
  name            TEXT
  geometry_type   TEXT                  -- 'Point', 'LineString', 'Polygon'
  attribute_schema JSONB                -- JSON Schema for extended attrs
  default_criticality INT
  icon            TEXT
  color           TEXT
  is_active       BOOL
```

**v1 asset classes:**

| Code | Domain | Geom | Description |
|---|---|---|---|
| WAT_MAIN | water | LineString | Water main |
| WAT_HYD | water | Point | Hydrant |
| WAT_VLV | water | Point | Water valve (gate, butterfly, check, PRV, BV, ARV — subtype in attrs) |
| WAT_SVC | water | LineString | Service line |
| WAT_MTR | water | Point | Meter |
| WAT_PMP | water | Point | Pump |
| WAT_RES | water | Polygon | Reservoir/tank |
| WAT_PRV | water | Point | PRV station |
| SAN_MAIN | sewer | LineString | Gravity sanitary sewer main |
| SAN_FM | sewer | LineString | Sanitary force main |
| SAN_MH | sewer | Point | Sanitary manhole |
| SAN_LFT | sewer | Point | Lift station |
| SAN_CO | sewer | Point | Cleanout |
| SAN_LAT | sewer | LineString | Sanitary lateral |
| SAN_GT | sewer | Point | Grease trap |
| STM_MAIN | storm | LineString | Storm main |
| STM_CB | storm | Point | Catch basin |
| STM_MH | storm | Point | Storm manhole |
| STM_OUT | storm | Point | Outfall |
| STM_CULV | storm | LineString | Culvert |
| STM_DTCH | storm | LineString | Ditch |
| STM_BMP | storm | Polygon | BMP (oil/grit, pond, swale) |
| STM_INL | storm | Point | Inlet |

### 3.3 Asset

```
asset
  id              BIGSERIAL PRIMARY KEY
  tenant_id       BIGINT NOT NULL
  asset_uid       TEXT NOT NULL                -- 'HYD-00421', unique within tenant
  class_code      TEXT NOT NULL REFERENCES asset_class(code)
  geom            GEOMETRY(GEOMETRY, 4326) NOT NULL
  install_date    DATE
  decommission_date DATE
  material        TEXT
  diameter_mm     INT
  length_m        NUMERIC(10,2)                -- for LineString classes
  depth_m         NUMERIC(6,2)
  manufacturer    TEXT
  model           TEXT
  serial_number   TEXT
  warranty_until  DATE
  condition       INT CHECK (condition BETWEEN 1 AND 5)    -- 1 best, 5 failed
  criticality     INT CHECK (criticality BETWEEN 1 AND 5)
  status          TEXT NOT NULL DEFAULT 'active'           -- active | abandoned | removed | proposed
  attrs           JSONB NOT NULL DEFAULT '{}'
  notes           TEXT
  created_at, updated_at, deleted_at
  UNIQUE (tenant_id, asset_uid)
```

Indexes:
- `GIST (geom)`
- `(tenant_id, class_code)`
- `(tenant_id, status) WHERE deleted_at IS NULL`
- `GIN (attrs jsonb_path_ops)`

### 3.4 Asset relationships

Connectivity matters for water (which valves isolate this main) and sewer (upstream/downstream tracing).

```
asset_link
  id BIGSERIAL PK
  tenant_id BIGINT NOT NULL
  from_asset_id BIGINT NOT NULL REFERENCES asset(id)
  to_asset_id BIGINT NOT NULL REFERENCES asset(id)
  relation TEXT NOT NULL    -- 'connects', 'isolates', 'upstream_of', 'serves'
  attrs JSONB DEFAULT '{}'
  UNIQUE (from_asset_id, to_asset_id, relation)
```

For v1, links are user-managed. Auto-generation from spatial proximity is v2.

### 3.5 Work orders

```
work_order
  id BIGSERIAL PK
  tenant_id BIGINT NOT NULL
  wo_number TEXT NOT NULL                      -- 'WO-2026-00123'
  type TEXT NOT NULL                            -- 'planned' | 'reactive'
  category TEXT NOT NULL                        -- 'main_break', 'flushing', 'valve_exercise',
                                                --   'cleaning', 'inspection', 'repair', 'install', 'other'
  priority TEXT NOT NULL                        -- 'low' | 'normal' | 'high' | 'emergency'
  status TEXT NOT NULL                          -- 'draft' | 'open' | 'assigned' | 'in_progress'
                                                --   | 'on_hold' | 'completed' | 'cancelled'
  title TEXT NOT NULL
  description TEXT
  asset_id BIGINT REFERENCES asset(id)          -- nullable; some WOs precede asset identification
  location GEOMETRY(POINT, 4326)                -- when no asset, store the location
  service_request_id BIGINT REFERENCES service_request(id)
  template_id BIGINT REFERENCES wo_template(id)
  scheduled_for TIMESTAMPTZ
  due_by TIMESTAMPTZ
  started_at TIMESTAMPTZ
  completed_at TIMESTAMPTZ
  reported_by BIGINT REFERENCES "user"(id)
  assigned_to BIGINT REFERENCES "user"(id)
  crew_id BIGINT REFERENCES crew(id)
  resolution TEXT
  attrs JSONB DEFAULT '{}'
  created_at, updated_at, deleted_at
  UNIQUE (tenant_id, wo_number)

work_order_task
  id, work_order_id, sequence, title, description,
  is_complete BOOL, completed_at, completed_by

work_order_time_log
  id, work_order_id, user_id, started_at, ended_at, hours_decimal, notes

work_order_material
  id, work_order_id, material_code, description, quantity, unit, unit_cost

work_order_attachment
  id, work_order_id, kind ('photo', 'doc', 'sketch'),
  s3_key, content_type, original_filename, taken_at, geo POINT, uploaded_by
```

`work_order.template_id` references `wo_template(id)` — the recurring-WO seed feature. See §3.10 for the `wo_template` schema, generation logic, API, and acceptance criteria.

Status transitions are enforced server-side. Illegal transitions return 409.

### 3.6 Inspections

Inspections share a base table and have type-specific extensions.

```
inspection
  id BIGSERIAL PK
  tenant_id BIGINT NOT NULL
  inspection_number TEXT NOT NULL                -- 'INS-2026-00045'
  kind TEXT NOT NULL                              -- 'cctv' | 'hydrant_flow' | 'valve_exercise'
                                                  --   | 'manhole' | 'catch_basin' | 'lift_station_round'
  asset_id BIGINT REFERENCES asset(id)
  work_order_id BIGINT REFERENCES work_order(id)
  performed_at TIMESTAMPTZ NOT NULL
  performed_by BIGINT REFERENCES "user"(id)
  overall_condition INT CHECK (1..5)
  pass BOOL
  notes TEXT
  data JSONB NOT NULL                             -- type-specific structured data
  created_at, updated_at, deleted_at
  UNIQUE (tenant_id, inspection_number)
```

#### CCTV inspection (PACP/MACP/LACP)

`data` schema for `kind = 'cctv'` (sanitary or storm):

```json
{
  "standard": "PACP",                  // PACP | MACP | LACP
  "version": "7.0",
  "upstream_mh": "MH-1234",
  "downstream_mh": "MH-1235",
  "direction": "upstream",             // upstream | downstream
  "length_surveyed_m": 87.5,
  "length_total_m": 92.0,
  "media_url": "s3://...",
  "observations": [
    {
      "distance_m": 12.4,
      "code": "CC",                    // PACP code
      "value_1": "06",
      "value_2": null,
      "clock_from": 10,
      "clock_to": 2,
      "joint": false,
      "continuous": false,
      "remarks": "circumferential crack",
      "photo_s3_key": "..."
    }
  ],
  "ratings": {
    "structural_qr": 4,
    "om_qr": 2,
    "structural_total": 28,
    "om_total": 10
  }
}
```

PACP code list seeded via fixtures. Validation against the seeded list on insert.

#### Hydrant flow test (NFPA 291)

```json
{
  "static_psi": 72,
  "residual_psi": 58,
  "flow_gpm": 980,
  "pitot_psi": 32,
  "outlet_size_mm": 64,
  "coefficient": 0.9,
  "calc_gpm_at_20psi": 1430,
  "color_class": "blue"      // NFPA: blue 1500+, green 1000-1499, orange 500-999, red <500
}
```

#### Valve exercise

```json
{
  "turns_to_close": 24,
  "expected_turns": 24,
  "operates": true,
  "leaks": false,
  "torque_excessive": false,
  "lubricated": true
}
```

#### Manhole inspection

```json
{
  "frame_cover_condition": 2,
  "chimney_condition": 2,
  "cone_condition": 1,
  "wall_condition": 2,
  "bench_channel_condition": 3,
  "infiltration_lpm": 0,
  "depth_m": 3.2,
  "h2s_ppm": 0
}
```

#### Catch basin inspection

```json
{
  "grate_condition": 2,
  "sump_depth_m": 0.5,
  "sediment_depth_m": 0.2,
  "needs_cleaning": true,
  "blockage": false
}
```

#### Lift station round

```json
{
  "wet_well_level_m": 1.4,
  "pump1_runtime_h": 1284.3,
  "pump2_runtime_h": 1199.7,
  "pump1_amps": 12.4,
  "pump2_amps": 12.1,
  "alarms": [],
  "generator_test_pass": true,
  "odour_pass": true
}
```

### 3.7 Service requests

```
service_request
  id BIGSERIAL PK
  tenant_id BIGINT NOT NULL
  sr_number TEXT NOT NULL                        -- 'SR-2026-00891'
  category TEXT NOT NULL                          -- 'low_pressure', 'no_water', 'sewer_backup',
                                                  --   'flooding', 'odour', 'damaged_asset', 'other'
  domain TEXT NOT NULL                            -- 'water' | 'sewer' | 'storm'
  status TEXT NOT NULL                            -- 'new' | 'triaged' | 'dispatched' | 'closed' | 'duplicate'
  priority TEXT NOT NULL
  reported_at TIMESTAMPTZ NOT NULL
  caller_name TEXT
  caller_phone TEXT
  caller_email TEXT
  address TEXT
  location GEOMETRY(POINT, 4326)
  description TEXT
  intake_user_id BIGINT REFERENCES "user"(id)
  work_order_id BIGINT REFERENCES work_order(id)
  closed_at TIMESTAMPTZ
  closure_notes TEXT
  attrs JSONB DEFAULT '{}'
  created_at, updated_at, deleted_at
  UNIQUE (tenant_id, sr_number)
```

A service request can spawn one or more work orders. WO carries `service_request_id`.

### 3.8 Crews

```
crew
  id, tenant_id, name, lead_user_id, is_active

crew_member
  crew_id, user_id, primary_key (crew_id, user_id)
```

### 3.9 Audit log

Every mutation logs to `audit_log`:

```
audit_log
  id, tenant_id, user_id, occurred_at,
  entity_type, entity_id, action ('create'|'update'|'delete'|'restore'),
  before JSONB, after JSONB, ip TEXT, user_agent TEXT
```

Implemented via two SQLAlchemy listeners on the `Session` class: `before_flush` captures diffs of `AuditableMixin` rows; `after_flush_postexec` inserts the corresponding `audit_log` entries (so primary keys of newly-created rows are populated). Non-mutation events (login, logout, failed_login, register_tenant) emit explicitly via `emit_event()` in `app/services/audit.py`. The `password_hash` field is unconditionally stripped from `before`/`after` payloads.

### 3.10 Recurring work orders

#### Purpose

v1 supports preventive maintenance through recurring work orders. This is the seed of the v2 Maintenance Planner: it provides the schema and basic UX that the Planner will extend with rules, compliance, and batch generation. v1 itself ships a minimal version — fixed-frequency, fixed-target — sufficient for a small utility to run a basic PM program without specialized planner tooling.

#### Out of scope for v1

- Conditional rules ("if asset attribute X then frequency Y")
- Compliance reporting against regulatory drivers
- Batch generation with map preview
- Workload forecasting
- Backlog/deferral management

All deferred to EPIC-V2-PLANNER (see `BACKLOG.md`).

#### Data model

New table: `wo_template`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK, indexed, NOT NULL |
| name | text | e.g., "Hydrant annual flow test" |
| description | text | nullable |
| asset_class | text | FK to asset class catalog. Required. |
| target_mode | enum('all_in_class', 'specific_assets') | NOT NULL |
| target_asset_ids | uuid[] | populated only when target_mode='specific_assets' |
| frequency_unit | enum('days', 'weeks', 'months', 'years') | NOT NULL |
| frequency_value | integer | NOT NULL, > 0 |
| priority | enum (matches WO priority) | default 'normal' |
| estimated_duration_minutes | integer | nullable |
| inspection_form_id | uuid | nullable, FK to inspection form catalog |
| active | boolean | default true |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| created_by | uuid | FK to users |

WO instances generated from a template carry `wo_template_id` (nullable FK on `work_order` table). This is how next-instance scheduling traces back.

#### Generation logic

Two triggers:

1. **On instance close** — when a WO with a non-null `wo_template_id` is closed, generate the next instance for the same asset with `due_date = completion_date + frequency`. One WO per asset.
2. **Scheduled job (daily)** — for any active template that has no open instance for an asset it targets, create one with `due_date = (last_close_date OR template_created_at) + frequency`. This handles missed completions and newly added assets that match an existing class-wide template.

Generation is idempotent: a single template + asset + open instance = at most one WO.

#### API surface

- `GET /api/wo-templates` — list, filter by asset_class, active
- `POST /api/wo-templates` — create
- `GET /api/wo-templates/{id}` — detail
- `PATCH /api/wo-templates/{id}` — update (changes apply to instances generated after the update; existing open instances unchanged)
- `POST /api/wo-templates/{id}/pause` and `/resume`
- `DELETE /api/wo-templates/{id}` — soft delete (sets active=false; never destroys history)

#### UI surfaces (v1)

- **WO Templates list** (Supervisor + Admin): table, filter by asset class, active toggle
- **WO Template editor**: form with name, asset class picker, target-mode toggle, frequency, defaults
- **Due / overdue view** (Supervisor home): list of open WOs by due date, filterable by template + asset class
- **Asset detail view**: show recurring WOs targeting this asset (so a tech sees what PM is on this asset)

#### Acceptance criteria

- **AC1**: Supervisor creates a WO template targeting all hydrants in the tenant with a 12-month frequency. System generates one WO per hydrant with `due_date = template_created_at + 12 months`.
- **AC2**: A WO generated from a template is closed. System generates the next instance for that asset with `due_date = completion_date + frequency`. No instance is generated for any other asset.
- **AC3**: A new hydrant is added 6 months after the template was created. The next daily job generates one WO for the new hydrant with appropriate due_date.
- **AC4**: A template is paused. No new instances generate until resumed. Existing open instances are unchanged.
- **AC5**: A template's frequency is changed from 12 months to 6 months. Existing open instances retain their original due_date. Instances generated after the change use the new frequency.
- **AC6**: Closing the last open instance for an asset under a paused template does not generate a new instance.
- **AC7**: Soft-deleting a template (active=false) does not regenerate instances. Existing open instances remain workable.

#### Open questions for v1

- Q1: Should a tech see "I'm working a template-generated WO" in the field PWA, with a link to the template? Recommendation: yes, low cost.
- Q2: When a template targets `all_in_class` and the class has thousands of assets, the daily job could generate a large WO batch in one tick. Acceptable, or batch over multiple days/workers? Recommendation: chunk generation over background workers; cap per-tick at N.
- Q3: When a tech reschedules a generated instance, does the *next* instance schedule from the original `due_date` or from the rescheduled date? Recommendation: from completion, not original due_date — keeps schedule self-correcting after weather/access delays.
- Q4: The pre-delta `wo_template` sketch in §3.5 carried `task_template JSONB` and `instructions TEXT` — a way for every recurring WO to inherit the same checklist and SOP text. The delta omits these. Is that intentional (rely on `inspection_form_id` for inspection-style PMs, leave reactive PMs without default tasks), or should `task_template` / `instructions` be added back? Without them there is no path for "every flushing WO carries the same default checklist."
- Q5: `work_order.category` is NOT NULL but `wo_template` has no `category` column in the delta. A template-generated WO needs its category set somewhere — options: (a) add `category` to the template (matches the old §3.5 sketch), (b) derive from the asset class catalog, (c) require the generation job to take it from a per-class default. Recommendation: (a) — explicit on the template, no surprise downstream.

---

## 4. API surface

REST. JSON. Versioned at `/api/v1`. Auth via session cookie. CSRF protection via `Flask-WTF` for state-changing requests.

Tenant scoping is implicit from session. Slug only appears in URL for human-readable routing on the frontend; the API uses session.

### Conventions

- `GET /api/v1/{collection}` — list with pagination (`?page=1&page_size=50`), filter (`?status=open`), sort (`?sort=-created_at`), search (`?q=...`)
- `GET /api/v1/{collection}/{id}` — by id (or `asset_uid` for assets)
- `POST /api/v1/{collection}` — create
- `PATCH /api/v1/{collection}/{id}` — partial update
- `DELETE /api/v1/{collection}/{id}` — soft delete

### Endpoints

#### Auth
- `POST /api/v1/auth/register-tenant` `{tenant_name, slug, admin_email, admin_password, full_name, phone?}` → `{tenant, user}`, sets cookie. Public; first registrant becomes the tenant's `admin`.
- `POST /api/v1/auth/login` `{tenant_slug, email, password}` → `{user, tenant}`, sets cookie. `tenant_slug` is required because email is only unique within a tenant (see §3.1).
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me` → `{user, tenant}`
- `POST /api/v1/auth/password/change` `{current, new}` (new ≥ 12 chars)

#### Tenant
- `GET /api/v1/tenant` — current tenant info
- `PATCH /api/v1/tenant` — admin only

#### Users
- `GET /api/v1/users` — admin only, paginated list (`?page&page_size&q`)
- `POST /api/v1/users` — admin only, create
- `GET /api/v1/users/{user_uid}` — admin only
- `PATCH /api/v1/users/{user_uid}` — admin only
- `DELETE /api/v1/users/{user_uid}` — admin only, soft delete
- `POST /api/v1/users/{user_uid}/roles` `{role_codes: [...]}` — admin only, replaces role assignments

#### Asset classes
- `GET /api/v1/asset-classes`
- `PATCH /api/v1/asset-classes/{code}` — admin only

#### Assets
- `GET /api/v1/assets?class=WAT_HYD&bbox=...&q=...`
- `GET /api/v1/assets/{asset_uid}`
- `POST /api/v1/assets`
- `PATCH /api/v1/assets/{asset_uid}`
- `DELETE /api/v1/assets/{asset_uid}` — soft delete
- `GET /api/v1/assets/{asset_uid}/history` — audit trail
- `GET /api/v1/assets/{asset_uid}/related` — linked assets, WOs, inspections
- `POST /api/v1/assets/import` — multipart, CSV or GeoJSON
- `GET /api/v1/assets/export?format=geojson|csv&class=...`

#### Asset links
- `GET /api/v1/asset-links?asset_id=...`
- `POST /api/v1/asset-links`
- `DELETE /api/v1/asset-links/{id}`

#### Work orders
- `GET /api/v1/work-orders?status=open&assigned_to=me&domain=water`
- `GET /api/v1/work-orders/{wo_number}`
- `POST /api/v1/work-orders`
- `PATCH /api/v1/work-orders/{wo_number}`
- `POST /api/v1/work-orders/{wo_number}/transition` `{to: 'in_progress', note?}`
- `POST /api/v1/work-orders/{wo_number}/tasks`
- `PATCH /api/v1/work-orders/{wo_number}/tasks/{task_id}`
- `POST /api/v1/work-orders/{wo_number}/time` — log time
- `POST /api/v1/work-orders/{wo_number}/materials`
- `POST /api/v1/work-orders/{wo_number}/attachments` — multipart
- `GET /api/v1/wo-templates` — list, `?asset_class=`, `?active=`
- `POST /api/v1/wo-templates` — admin / supervisor
- `GET /api/v1/wo-templates/{id}`
- `PATCH /api/v1/wo-templates/{id}` — applies to instances generated after the update; existing open instances unchanged
- `POST /api/v1/wo-templates/{id}/pause`
- `POST /api/v1/wo-templates/{id}/resume`
- `DELETE /api/v1/wo-templates/{id}` — soft delete (`active=false`)

See §3.10 for generation semantics and acceptance criteria.

#### Inspections
- `GET /api/v1/inspections?kind=cctv&asset_id=...`
- `GET /api/v1/inspections/{inspection_number}`
- `POST /api/v1/inspections`
- `PATCH /api/v1/inspections/{inspection_number}`
- `POST /api/v1/inspections/import-pacp` — multipart, PACP exchange format
- `GET /api/v1/inspections/export?format=csv|pacp`

#### Service requests
- `GET /api/v1/service-requests?status=new`
- `GET /api/v1/service-requests/{sr_number}`
- `POST /api/v1/service-requests`
- `PATCH /api/v1/service-requests/{sr_number}`
- `POST /api/v1/service-requests/{sr_number}/dispatch` `{work_order: {...}}`

#### Reports
- `GET /api/v1/reports/break-history?from=...&to=...&class=WAT_MAIN`
- `GET /api/v1/reports/wo-summary?from=...&to=...`
- `GET /api/v1/reports/inspection-summary?kind=cctv&from=...&to=...`
- `GET /api/v1/reports/age-distribution?domain=water`
- `GET /api/v1/reports/condition-criticality-matrix?domain=water`
- All reports support `?format=json|csv|pdf`

#### Tile metadata
- `GET /api/v1/tile-layers` — list of layers with URLs to pg_tileserv
- pg_tileserv itself runs at `/tiles/{layer}/{z}/{x}/{y}.pbf` (proxied; auth via session)

#### Search
- `GET /api/v1/search?q=...` — global search across assets, WOs, SRs, inspections

---

## 5. Frontend

### Routes

```
/                          → redirects to /{slug}/map if logged in
/login
/{slug}/map                → main map view (default landing for ops users)
/{slug}/assets             → asset list + filters
/{slug}/assets/{uid}       → asset detail
/{slug}/work-orders        → list/board
/{slug}/work-orders/{n}    → detail
/{slug}/inspections        → list
/{slug}/inspections/{n}    → detail
/{slug}/service-requests   → list/queue
/{slug}/service-requests/{n}
/{slug}/reports            → report selector + viewer
/{slug}/admin/...          → admin only
/field                     → PWA entry; offline-capable
```

### Map view

- MapLibre GL JS, vector tiles from pg_tileserv.
- Layer panel: toggle each asset class.
- Legend keyed to asset class color/icon.
- Click asset → side panel with detail, related WOs, inspections.
- Right-click on map (or long-press on touch) → "Create work order here" / "Create service request here" / "Add asset here".
- Bounding box filter and class filter persist in URL params.
- Basemap selector: OSM, satellite (provided via env-configured tile URL), blank. No basemap is bundled by default to avoid licensing issues.

### Field PWA (`/field`)

- Installable PWA with service worker.
- IndexedDB cache of assets within a configurable radius of last known location and assigned WOs.
- Outbound mutation queue: any POST/PATCH while offline is queued and replayed on reconnect.
- Photo capture with EXIF GPS preserved.
- Conflict handling on sync: server wins, conflict surfaced to user with diff.

---

## 6. Permissions matrix

| Action | Admin | Supervisor | Tech | Readonly | Intake |
|---|---|---|---|---|---|
| Manage users/roles | ✅ | — | — | — | — |
| Edit asset class schema | ✅ | — | — | — | — |
| Create/edit asset | ✅ | ✅ | view+limited | view | view |
| Bulk import assets | ✅ | ✅ | — | — | — |
| Create work order | ✅ | ✅ | ✅ (own) | — | ✅ (via SR) |
| Assign work order | ✅ | ✅ | — | — | — |
| Complete work order | ✅ | ✅ | ✅ (assigned) | — | — |
| Cancel work order | ✅ | ✅ | — | — | — |
| Create inspection | ✅ | ✅ | ✅ | — | — |
| Create service request | ✅ | ✅ | ✅ | — | ✅ |
| Dispatch SR → WO | ✅ | ✅ | — | — | — |
| Run reports | ✅ | ✅ | own data | ✅ | own data |
| Export data | ✅ | ✅ | — | ✅ | — |

"Tech own data" means the tech only sees WOs assigned to them or their crew, and only their own time logs and inspections.

---

## 7. Acceptance criteria per epic

PRs must satisfy these to be merged.

### Epic 1: Auth & multi-tenancy
- [ ] User can register a tenant, become first admin
- [ ] User logs in, session cookie set Secure/HttpOnly/SameSite=Lax
- [ ] Logout clears session
- [ ] Password change with current-password verification
- [ ] Argon2 hashing verified by inspecting the hash format
- [ ] All API endpoints reject requests without a session with 401
- [ ] Cross-tenant data access returns 404 (not 403, to avoid information leak)
- [ ] Audit log records login, logout, failed login

### Epic 2: Asset CRUD
- [ ] All 23 asset classes seeded
- [ ] Create/read/update/soft-delete asset for each geometry type
- [ ] Asset list paginates, filters, searches
- [ ] Bbox spatial query returns assets in viewport
- [ ] CSV import: 1000 assets in < 10s, validation errors reported per row
- [ ] GeoJSON import handles FeatureCollection
- [ ] GeoJSON export round-trips (export → import → identical)
- [ ] Audit log captures every change with before/after JSONB
- [ ] Unit conversions: stored SI, displayed per tenant locale (m vs ft, mm vs in)

### Epic 3: Work orders
- [ ] WO creation from scratch, from template, from asset, from SR
- [ ] Status transitions enforced (draft→open→assigned→in_progress→completed; + on_hold, cancelled)
- [ ] Tasks reorder, complete individually
- [ ] Time logging sums correctly to total hours
- [ ] Materials log totals cost
- [ ] Attachments upload to S3, GPS preserved from EXIF
- [ ] Kanban board view: drag between status columns updates server

#### Recurring WO acceptance criteria (§3.10)

- [ ] **AC1**: Template targeting all-in-class generates one WO per matching asset on creation, `due_date = template_created_at + frequency`.
- [ ] **AC2**: Closing a template-generated WO generates the next instance for the same asset with `due_date = completion_date + frequency`. No instance is generated for any other asset.
- [ ] **AC3**: An asset added after the template was created gets a WO on the next daily-job tick with appropriate due_date.
- [ ] **AC4**: A paused template generates no new instances; existing open instances are unchanged.
- [ ] **AC5**: Frequency change applies only to instances generated after the change; open instances retain their original due_date.
- [ ] **AC6**: Closing the last open instance under a paused template does not generate a new instance.
- [ ] **AC7**: Soft-delete (`active=false`) does not regenerate instances; open instances remain workable.

### Epic 4: Inspections
- [ ] All 6 inspection kinds creatable
- [ ] CCTV: PACP code list seeded, validation rejects unknown codes
- [ ] CCTV: distance must be ≤ length_surveyed_m
- [ ] Hydrant flow: calc_gpm_at_20psi computed server-side, color_class derived
- [ ] PACP import accepts WinCan exchange format
- [ ] Inspection detail page renders type-specific layout
- [ ] Export to CSV per type

### Epic 5: Service requests
- [ ] Intake form creates SR with location + caller info
- [ ] Reverse geocode address → location (uses configurable provider; fallback manual)
- [ ] Triage flow: new → triaged with category + priority
- [ ] Dispatch creates linked WO; SR moves to dispatched
- [ ] Closed SR captures closure notes
- [ ] Duplicate detection: warn on SRs at same address within 7 days

### Epic 6: Map UI
- [ ] All asset classes render as configurable layers
- [ ] Layer toggle, legend, basemap selector
- [ ] Click asset → side panel with full detail and related items
- [ ] Right-click context menu creates WO/SR at point
- [ ] Filter persists in URL params
- [ ] Performance: 50,000 assets in viewport at 60fps via vector tiles

### Epic 7: Field PWA
- [ ] App installs from browser
- [ ] Loads when offline after first visit
- [ ] Cached assets visible offline within last-cached bbox
- [ ] Mutations queue offline, replay on reconnect
- [ ] Photo capture preserves EXIF GPS
- [ ] Conflict UI shown when server rejects on replay

### Epic 8: Reports
- [ ] All 5 canned reports return correct data verified by fixtures
- [ ] CSV export matches JSON content
- [ ] PDF export uses ReportLab, branded with tenant name and logo
- [ ] Date range filtering works inclusive of endpoints

### Epic 9: Admin
- [ ] User invite flow: email with one-time token
- [ ] Role assignment UI
- [ ] Asset class JSONB schema editor (form-based, validates JSON Schema)
- [ ] Tenant settings: units, locale, default projection, branding

---

## 8. Non-functional requirements

- **Performance:** Asset list endpoint < 200ms p95 for 100k assets. Map viewport < 500ms for 50k assets via tiles.
- **Availability:** 99.5% target on Railway. Background job retries with backoff.
- **Security:** OWASP Top 10. CSP headers, HSTS, secure cookies. Argon2id hashing + Flask-WTF CSRF (live as of S1). Rate limit auth endpoints (10/min/IP) — wired in S12 hardening.
- **Privacy:** Audit log retention configurable per tenant, default 7 years. PII (caller info on SRs) is logged minimally.
- **Backups:** Postgres daily logical dump to S3, 30-day retention. Documented restore procedure.
- **Observability:** Structured logs, request IDs, healthcheck endpoint at `/healthz`.

---

## 9. Build order (suggested sprints)

Each sprint is a few days for a solo dev. PRs small.

1. **S0 — Foundation.** Repo scaffold, Docker compose, Postgres+PostGIS, Alembic, base Flask app, CI (lint+test), `/healthz`.
2. **S1 — Auth & tenancy.** Tenant + user + role. Login/logout. Session middleware. Tenant filter on session.
3. **S2 — Asset class catalog + Asset CRUD.** Seeds, models, migrations, API, validation. Audit log infra.
4. **S3 — Asset map.** pg_tileserv setup, MapLibre frontend, layer panel. Click → detail.
5. **S4 — Asset import/export.** CSV + GeoJSON.
6. **S5 — Work orders.** Models, API, Kanban + list, templates, tasks, time, materials, attachments.
7. **S6 — Inspections (non-CCTV first).** Hydrant flow, valve, MH, CB, lift station rounds. Type-specific UI.
8. **S7 — CCTV/PACP.** Code list, validation, import, viewer.
9. **S8 — Service requests.** Intake, triage, dispatch.
10. **S9 — Reports.** All five, JSON/CSV/PDF.
11. **S10 — Field PWA.** Service worker, IDB cache, mutation queue.
12. **S11 — Admin & polish.** User invites, schema editor, settings, tenant onboarding.
13. **S12 — Hardening.** Rate limits, CSP, backups, runbooks.

---

## 10. Open questions (decide before starting affected sprint)

| # | Question | Affects | Default if no decision |
|---|---|---|---|
| 1 | Geocoding provider | S8 | Nominatim (OSM) self-hosted; manual fallback |
| 2 | Email provider | S1, S11 | Resend; abstract behind interface |
| 3 | PDF report library | S9 | ReportLab (matches Candy Dash) |
| 4 | Basemap source | S3 | OSM raster XYZ; satellite via env |
| 5 | PACP version target | S7 | PACP 7.0 |
| 6 | Tenant URL strategy | S1 | ~~Subpath `/{slug}/...` for v1; subdomain in v2~~ — resolved in S1: subpath `/{slug}/...` |
| 7 | Pricing model details | post-v1 | Out of scope |

---

## 11. Done definition for v1

A small utility can:

1. Sign up, invite their crew, configure their domains.
2. Import their existing GIS data (CSV or GeoJSON).
3. View it on a map with all three domains.
4. Take a service request call, dispatch a work order, complete it in the field on a phone, attach photos.
5. Run a CCTV inspection, import the PACP file, link it to the sewer main.
6. Pull a quarterly report on work orders completed, assets inspected, breaks per kilometre.
7. Export everything as GeoJSON or CSV for their records.

If all of that works without a developer involved, v1 ships.
