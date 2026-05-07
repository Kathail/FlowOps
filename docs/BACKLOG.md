# BACKLOG.md — CityWater post-v1

Epics and features deferred from v1. Each epic captures enough scope and rationale that future planning sessions don't re-derive it from scratch. Epic IDs are placeholders — adjust to your convention.

---

## EPIC-V2-PLANNER — Maintenance Planner workspace

### Rationale

v1 ships with manual recurring WOs (single asset or whole class, fixed frequency). This is enough for small utilities but breaks down at scale: regulated PM programs need conditional rules, compliance reporting, batch generation, and workload forecasting. The Planner workspace turns CityWater from "asset registry with reactive ops" into a real PM program — which is the load-bearing claim of the Cityworks-alternative positioning.

### Triggered when

- A pilot tenant has >5,000 assets in any single class, OR
- A pilot tenant requests regulatory compliance reporting (MECP, AWWA, internal SOP), OR
- Manual recurring WO management is consuming material Supervisor time (set a threshold during pilot)

### Personas affected

- **Maintenance Planner** (new persona — strategic, weeks-to-year horizon, schedule and compliance driven)
- Supervisor (delegates schedule generation to Planner)
- Admin (manages PM rule library at tenant level)

### In scope

- **PM rule engine**: per-asset-class, per-attribute conditional rules. JSONB-driven, tenant-scoped. Example: "hydrants flow-tested annually, exception for dead-end mains >X length = semi-annually."
- **Compliance dashboard**: overdue / due-this-quarter / at-risk, filterable by regulatory driver
- **Batch WO generation**: select a PM run, preview generated WOs, adjust crew/date assignments, commit. Never auto-commit.
- **Geographic clustering at batch generation**: group WOs by geography to cut windshield time. Map preview before commit.
- **Workload forecast**: 90-day projection of PM-hours by crew/skill, compared to capacity. Surfaces deferred-maintenance pressure.
- **Backlog manager**: aging report on deferred PMs, override justifications, supervisor sign-off on long-deferred items.
- **Recurring inspection programs**: PACP CCTV cycle, manhole condition assessment cycle. These are programs, not single PMs — own UI, multi-year planning horizon.

### Out of scope (push to v3+)

- Crew skill-matching beyond simple skill flags
- Cost optimization (least-cost routing, contractor vs in-house decision)
- Predictive maintenance / failure modeling

### Dependencies in v1

- Recurring WO seed feature lays the schema foundation. Planner extends it; doesn't replace it.
- Asset class JSONB attribute schema must support arbitrary field queries.
- Tenant-scoped rule storage requires `tenant_id` discipline (multi-tenancy from v1 — already in scope).

### Open questions

- Q1: Does the rule engine need a UI editor, or is admin-only JSON edit acceptable for v2? (UI editor is significant scope.)
- Q2: How are regulatory drivers cataloged? Hardcoded enum vs tenant-defined?
- Q3: Compliance reporting export format — CSV, PDF, both?
- Q4: When PM rules change mid-cycle, how do already-scheduled WOs reconcile?

### Estimated sprints

3–4. Rule engine + storage = 1, batch generation + clustering = 1, compliance dashboard = 1, recurring inspection programs = 1.

---

## EPIC-V2-DISPATCHER — Dispatcher workspace

### Rationale

v1 service request handling is manual: Service Intake creates a request, Supervisor triages and assigns. This works at low volume but fails as soon as a utility has a busy day (water main break + sewer backup + locate request hitting at once). The Dispatcher workspace gives a single live operational picture — crews, calls, requests, equipment — that a small utility can run their entire day from.

### Triggered when

- Pilot tenant exceeds threshold of concurrent open service requests on a typical day, OR
- Pilot tenant requests after-hours/on-call dispatch handoff tooling, OR
- Supervisor reports inability to maintain operational picture across phone, map, and WO list

### Personas affected

- **Dispatcher** (new persona — tactical, real-time, geography and crew-availability driven)
- Service Intake (collapses partly into Dispatcher in small utilities — see open question)
- Field tech (status updates flow from PWA to Dispatcher live)
- Supervisor (escalation target)

### In scope

- **Live map**: crews (status: available / en-route / on-site / out-of-service), active WOs, pending service requests, layered toggles
- **Incoming queue**: priority-sorted (main break > sewer backup > low pressure > general inquiry), drag-to-assign, SLA timer per priority class
- **Crew status panel**: clocked-in roster, current assignment, current location, equipment with them (CCTV truck, vactor, valve turner)
- **One-click assignment**: pick request, suggest nearest available crew with right kit, confirm. Override always allowed.
- **Escalation tools**: request second crew, page on-call supervisor, escalate to contractor. Logged.
- **Caller communication**: templated text/email status updates back to requester
- **Locate coordination**: flag WOs needing Ontario One Call, track ticket status, block dispatch on dig work until cleared
- **Shift handoff**: open WOs + active situations rolled into a written artifact at shift change. After-hours/on-call gets the same.

### Out of scope (push to v3+)

- Two-way voice integration (radio, phone)
- Automated routing/ETA from external traffic data
- AI-assisted priority triage

### Dependencies in v1

- Field PWA must be able to report position continuously when a crew is clocked in. v1 has the PWA but may not have continuous location reporting — needs SPEC delta if not already in scope.
- Real-time updates to the dispatcher screen require WebSocket or SSE — not currently in v1 stack. Adding this is the largest single architectural lift for this epic.
- Service Intake role and request schema in v1 must be extensible enough to flow cleanly into the Dispatcher queue.

### Open questions

- Q1: Does Service Intake remain a separate role or collapse into Dispatcher? Small utilities = collapse. Large = separate. Needs tenant-level toggle?
- Q2: WebSocket vs SSE — pick before v2 starts. SSE is simpler and sufficient for dispatcher updates; WebSocket only if bidirectional needs emerge.
- Q3: How is "nearest crew" calculated when crews aren't actively reporting position? Last-known + manual override?
- Q4: Locate ticket integration — Ontario One Call API directly, or manual ticket # entry with status mirroring?
- Q5: After-hours dispatch — different UI mode or same UI with different on-call user?

### Estimated sprints

3–4. Live map + crew status = 1, queue + assignment = 1, communication + locates = 1, shift handoff + after-hours mode = 1.

---

## Cross-epic notes

Both epics introduce new personas. The permissions model in v1 must store roles in a way that adding two more roles is a data migration, not a refactor. (If v1 currently uses an enum on `users.role`, switch to a join table before v1 GA.)

> **Verified (2026-05-06).** Schema is already a `Role` + `user_role` join table (`backend/app/models/user.py`); no `users.role` enum exists. Adding new roles for v2 is a data insert, not a migration. The places that need updating when v2 lands: `backend/app/api/auth.py` `DEFAULT_ROLES` (per-tenant seed list), `frontend/src/features/admin/AdminUsersPage.tsx` `ROLE_OPTIONS` (UI checklist), and any `@require_roles(...)` decorators on endpoints that should grant the new role.
>
> **Gotcha for v2 cutover:** `DEFAULT_ROLES` only seeds new tenants. When the new role codes are added there, **existing tenants need a one-shot data backfill** (insert one `Role` row per tenant per new code). Plan a small Alembic data migration as part of the EPIC-V2 rollout, not the schema migration the original note feared.

Both epics depend on the v1 work order and asset models being stable. Avoid material schema churn on those tables after v1 GA, or these epics balloon.
