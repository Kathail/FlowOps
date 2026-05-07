# Handoff — production deploy + post-audit hardening sweep

Last commits on `main` (newest → oldest, post-deploy hardening):

- `4553e41` — fix(demo): drop `/demo` redirect (caught the post-login navigate too)
- `6d7c7b6` — fix(demo): rename auto-login route to `/try-demo` (collision with tenant slug "demo")
- `6074f0c` — fix(demo): hard 12s timeout on login fetch
- `8fca6a8` — ui(demo): per-step status, watchdog, hard-reset escape hatch
- `ff1c56a` — fix(pwa): switch SW to autoUpdate + drop /me from runtime cache
- `8f7b294` — ui: mobile-friendly shell + drawer nav + harden DemoLoginPage
- `b0277f4` — fix(frontend): use nginx-alpine's built-in resolver helper for Railway
- `a698ea9` — feat: zero-friction demo flow + Railway DNS fix + GIT_SHA fallback
- `6a1f699` — feat(health): add `/healthz/deep` readiness endpoint

A multi-agent deep audit then ran (5 parallel agents covering security, code quality, frontend, DB, infra/docs). The full punch list lives in conversation history; the pending change list at the bottom of this doc captures what landed in the post-audit fix sweep.

v1 has shipped (S0–S12) and the post-v1 trajectory now includes: dark UI rebrand, recurring schedules, activity timeline + cross-entity links, link-driven autopopulation, the task-definitions catalog (28 tasks across water/sewer/storm/general), `simulate-year` CLI, smart comment chips, checklist-driven drafts, daily WOs grouping SRs, dashboard with KPIs + supervisor metrics + by-area panel, map overlays, service areas, demo-tenant button (now zero-friction at `/try-demo`), audit infrastructure, the UI primitives + UX sweep, mobile-responsive shell with drawer nav, marketing brochure at citywater.ca, full Railway production deploy, and a security hardening pass that closed cross-tenant `db.session.get()` exposures, missing `@require_roles` gates, and several other P0s/P1s.

## Where things stand right now

| Area | State |
|---|---|
| **Frontend tests** | **200** (`cd frontend && npm test`) |
| **Backend tests** | **371** (`cd backend && uv run pytest`) |
| **Migrations** | 0001–0028 apply cleanly; latest is `0028_service_area`. No new migrations pending. |
| **Lint / typecheck** | Clean: `npm run lint`, `npx tsc -b`, `prettier --check` on touched files |
| **Dev servers** | Currently up: backend `127.0.0.1:5000`, Vite `127.0.0.1:5173` (started this session, still running) |

### Last session (UX sweep + spec delta)

Two commits worth of work, both pushed:

- **`308b6b7` — UX sweep.** Added five new primitives + libs with tests: `<ConfirmDialog>` (portal-rendered modal replacing native `confirm()`; backdrop + Escape; busy/error states), `<StatusPill tone dot>` (single source of truth for status / priority / pass-fail badges, optional dot for colorblind cues), `<Dash>` (standardised null-value placeholder), `lib/format.ts` (locale-aware `formatDateTime`/`formatDate`/`formatRelative` via `Intl`), `lib/translateApiError.ts` (API code → user copy, generic fallback so `TypeError` stack traces never leak), `lib/useUnsavedChangesWarning` (`beforeunload` guard — limited; in-app nav blocking needs `createBrowserRouter` migration). Then swept the codebase: 4 list pages got `overflow-x-auto`, 5 native `confirm()` sites migrated to `<ConfirmDialog>`, 10 mutation handlers switched to `translateApiError()`, status pills consolidated across WO/SR/Inspection/Admin/Schedule pages, dates standardized via `formatDateTime`, list pages got `<EmptyState>` with context-aware CTAs (Clear filters / New X), search inputs got Enter-to-submit, `IntakeDialog` + `DispatchDialog` got tenant context + required-field asterisks + Esc/backdrop close + ARIA dialog roles. Refactored `.btn-*` utilities to split sizing into `.btn-sm` (no `!important` needed via cascade order) and added a real `.btn-secondary` distinct from ghost.
- **`e43d9b9` — docs.** Created `docs/BACKLOG.md` capturing the two v2 epics (Maintenance Planner workspace, Dispatcher workspace) with rationale, trigger conditions, persona impact, in/out scope, v1 dependencies, open questions, and rough sprint estimates. Added §3.10 to `SPEC.md` with the recurring-WO spec delta — full data model (`wo_template`), generation logic (on-close + daily-job, idempotent), API surface, UI surfaces, AC1–AC7. Replaced the brief `wo_template` sketch in §3.5 with a forward-pointer to §3.10.

## Decisions that are blocking the next sprint

These are written into §3.10 of `SPEC.md` as Q4 and Q5 — they need to be answered before any recurring-WO code starts:

- **§3.10 Q4 — `task_template` / `instructions`?** The pre-delta `wo_template` sketch in §3.5 carried `task_template JSONB` + `instructions TEXT` so every recurring WO inherited the same checklist + SOP text. The delta omits these. Without them there is no path for "every flushing WO carries the same default checklist." Either add them back (recommended) or document why they're intentionally omitted (e.g. rely on `inspection_form_id` for inspection PMs and accept reactive PMs have no defaults).
- **§3.10 Q5 — where does `category` come from?** `work_order.category` is NOT NULL but `wo_template` (per the delta) has no `category` column. Three options: (a) add `category` to the template, matching the old §3.5 sketch [recommended]; (b) derive from the asset class catalog; (c) require the daily generation job to take it from a per-class default.

## Next-step candidates

Pick one based on time horizon:

1. **Adjudicate §3.10 Q4 + Q5** so the recurring-WO sprint is unblocked. Decisions only the project owner can make.
2. **Recurring WO sprint** itself (post Q4/Q5): backend migration + generation job + UI per §3.10. ~1 sprint per the spec.
3. **Adopt `<UnsavedChangesGuard>` on the other forms.** Currently only mounted on `AssetDetailPage`. Strong candidates: `WorkOrderDetailPage` (TaskSection / TimeSection / MaterialsSection — debounced auto-save means dirty windows are short, but inline-edit forms still benefit), `InspectionDetailPage` (debounced task_data writes), `ServiceRequestDetailPage` (same), `AdminAssetClassesPage` (JSON Schema editor — long edit sessions, easy to lose).
4. **`LayerPanel` select-all/none + basemap help text** — small UX redesign that didn't fit the sweep PRs.

### Resolved since the last handoff

- ✅ **`users.role` schema check** — schema is already a `Role` + `user_role` join table; no `users.role` enum exists. Adding new roles for v2 is a data insert, not a migration. Notes added to `BACKLOG.md` cross-epic section, including the per-tenant role-backfill gotcha for v2 cutover.
- ✅ **`createBrowserRouter` migration** — `App.tsx` now uses the data router via `createRoutesFromElements`. v7 future flags (`v7_relativeSplatPath`, `v7_startTransition`) opted in; the test-output warnings are gone.
- ✅ **In-app unsaved-changes blocking** — new `<UnsavedChangesGuard dirty>` component composes `useBlocker` (in-app nav) + `useUnsavedChangesWarning` (tab close) and renders a `<ConfirmDialog>` when blocked. Adopted in `AssetDetailPage`. Tests for the guard mock `useBlocker` (jsdom + node-undici realm mismatch breaks real router navigation under tests; mocking is the standard workaround).

## Resume workflow

```sh
# 1. From repo root, make sure Postgres is up
sudo systemctl start postgresql        # if not running
make dev                               # docker-compose stack — only needed for MinIO/Redis/pg_tileserv

# 2. Backend
cd backend
uv sync
uv run flask --app app.wsgi db upgrade  # no pending migrations as of e43d9b9
uv run flask --app app.wsgi run --debug --no-reload --port 5000 --host 127.0.0.1 &

# 3. Frontend
cd ../frontend
npm install
npm run dev &

# 4. Open http://127.0.0.1:5173 — login or hit "Try the demo →"
```

The dev servers from this session are still running. If they're stale after a code change: `pkill -f "flask --app"` and `pkill -f vite` then restart.

## Memory hooks for the next session

The `~/.claude/projects/.../memory/` directory has these standing preferences saved:

- **`feedback_persistent_dev_stack.md`** — keep backend + Vite running between actions, don't ask
- **`feedback_best_practice_always.md`** — standing approval to layer in best-practice additions on top of plan defaults; don't re-ask each sprint
- **`feedback_git_config_rule.md`** — when user provides identity values, set local-repo git config and proceed
- **`user_git_identity.md`** — commits as `Kathail` / GitHub noreply email

## Outstanding spec deviations & notes

- §3.10 is the authoritative `wo_template` schema. The brief sketch in §3.5 has been replaced by a pointer to §3.10. If a future spec edit re-adds fields to §3.5, treat that as a divergence to reconcile.
- `task_template` / `instructions` / `category` open questions on §3.10 are real — see "Decisions blocking the next sprint" above.
- The `ConfirmDialog` is the project's canonical confirmation pattern — nothing else should call `window.confirm()`. If a new flow needs confirmation, use `<ConfirmDialog>` (it's portal-rendered so it works from anywhere, including `<tr>`).
- `lib/translateApiError.ts` is the canonical API-error → user-copy mapper. New mutation handlers should use it; raw `err.message` in user-visible alerts is a regression.
- `lib/format.ts` is the canonical date formatter. Anything that does `.slice(0, 16).replace("T", " ")` or `.toLocaleString()` directly is drift.
- The frontend uses the **data router** (`createBrowserRouter` + `RouterProvider`) — `useBlocker` is available, and `<UnsavedChangesGuard>` covers both tab-close and in-app navigation. v7 future flags are on (`v7_relativeSplatPath`, `v7_startTransition`).
- PACP code seed is still a representative subset; NASSCO licensing required for full set.
- Vite dev server pinned to `127.0.0.1` for IPv4 (Node 25 was selecting `::1`).

## Things to know going in

- All work is squash-merged to `main`; original branch history is on GitHub under `feat/sprint-N-…` for the v1 sprints.
- Frontend bundle: auth+assets+work-orders+inspections at ~97 KB gzipped, map chunk at ~290 KB gzipped (lazy on `/map`). Has not been re-measured since the post-v1 work landed; worth re-checking before GA.
- The OpenAPI spec at `/api/v1/openapi.json` is auto-generated from Pydantic schemas; `npm run generate-api` regenerates `frontend/src/api/generated.ts` (currently unused; type defs only).
- `flask seed-demo` followed by `flask simulate-year` produces a populated `demo` tenant with 12 months of synthetic activity. The "Try the demo →" button on the login page logs into that tenant.
