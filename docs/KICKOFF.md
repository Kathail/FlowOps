# KICKOFF.md — sprint kickoff prompts (S0 archive + per-sprint template)

S0 was bootstrapped from the prompt under "First prompt to Claude Code" below; that section is now historical. For sprints S1+, use the reusable shape under "Subsequent sprint prompts." Both are archival — the active source of truth is `docs/SPEC.md`.

---

## First prompt to Claude Code

```
Read CLAUDE.md and docs/SPEC.md in full before doing anything.

Your task: implement Sprint 0 (Foundation) from SPEC.md section 9.

Sprint 0 acceptance:
- Repo scaffold matching the layout in CLAUDE.md
- backend/ with Flask 3, SQLAlchemy 2 (typed), Alembic, pydantic-settings, ruff,
  pytest configured. App factory pattern. /healthz endpoint that checks DB.
- frontend/ with Vite + React 18 + TypeScript strict + Tailwind + ESLint + Prettier.
  Single placeholder route that hits /healthz and renders the result.
- infra/docker-compose.yml bringing up:
    - postgres:16 with postgis/postgis:16-3.4 image
    - redis:7
    - minio/minio
    - pramsey/pg_tileserv
  All with named volumes, healthchecks, sensible env defaults.
- .pre-commit-config.yaml running ruff + ESLint + prettier-check
- .gitignore comprehensive (Python, Node, env, IDE, OS)
- README.md with: prerequisites, "make dev" workflow, port map, first-run steps
- Makefile with: dev, test, lint, fmt, db-upgrade, db-revision, seed
- CI workflow at .github/workflows/ci.yml: lint + test for backend and frontend
- backend/Dockerfile and frontend/Dockerfile (multi-stage, slim final images)
- infra/railway.toml with both services configured

Hard requirements:
- No code that isn't covered by SPEC.md or CLAUDE.md
- Every dependency added is justified in a comment in pyproject.toml or package.json
- All env vars documented in backend/.env.example and frontend/.env.example
- Argon2 password hashing dependency added but no auth code yet (that's S1)
- PostGIS extension created via Alembic migration, not by hand
- /healthz returns 200 with {"db": "ok", "version": "<git sha>"} when DB is reachable

Out of scope for this sprint (do not start):
- Any models beyond what's needed for /healthz
- Any auth code
- Asset, WO, inspection, SR — none of it

Deliverable: a single PR titled "feat: sprint 0 foundation" with a checklist
in the description matching the acceptance criteria above.

Before you start writing code, post a short plan listing:
1. Files you will create
2. Dependencies you will add and why
3. Any ambiguities in the spec you want resolved

Wait for me to approve the plan before implementing.
```

---

## Subsequent sprint prompts (template)

For Sprint N > 0, use this shape:

```
Read CLAUDE.md and docs/SPEC.md if they aren't already in context.

Your task: implement Sprint N (<name>) from SPEC.md section 9.

Read the matching epic in section 7 (Epic <X>: <name>) for acceptance criteria.

Constraints:
- Only what's in this sprint's scope. Out-of-scope items get a TODO with an issue number.
- Every endpoint has a Pydantic request schema, Pydantic response schema, and tests.
- Every model has a factory in tests/factories/.
- Migrations: one per logical schema change, not one per sprint.
- Frontend changes go in features/<feature>/, not scattered.

Before coding, post a plan with:
1. Migrations you'll create
2. Endpoints you'll add (path, method, request, response)
3. Frontend routes/components
4. Test coverage plan
5. Open questions

Wait for approval before implementing.
```

---

## Things to keep doing every session

1. **Pin the spec.** First prompt of every Claude Code session: "Re-read CLAUDE.md and docs/SPEC.md sections relevant to this sprint."
2. **Reject scope creep.** If CC suggests a feature not in SPEC, the answer is "not in v1 — add to docs/BACKLOG.md."
3. **Demand the plan first.** Never let CC start implementing without posting the plan and getting approval. The plan catches misreadings of the spec.
4. **One sprint per branch.** `feat/sprint-N-<name>`. Multiple PRs into the branch, single merge to main when sprint is done and acceptance is met.
5. **Run the acceptance checklist by hand before merge.** Don't trust CC's self-report. Check each box yourself.
6. **Keep CLAUDE.md and SPEC.md updated.** When a decision is made mid-sprint, update the spec in the same PR. The spec is the contract.

---

## Things that will go wrong (and how to redirect)

| Symptom | Redirect |
|---|---|
| CC reaches for SQLite or in-memory DB | "PostGIS only. CLAUDE.md hard rule. Set up Postgres in tests via testcontainers or pytest-postgresql." |
| CC writes haversine in Python | "Use ST_DWithin / ST_Distance. CLAUDE.md hard rule." |
| CC adds a third-party UI kit | "Tailwind only. If a primitive is needed, build it or pull from shadcn/ui pattern (copy, don't depend)." |
| CC stores tenant_id from request body | "Tenancy from session. CLAUDE.md hard rule." |
| CC writes giant PR with everything | "Split. One concept per PR." |
| CC adds bcrypt | "Argon2id only." |
| CC suggests skipping tests "for now" | No. Tests in the same PR. |
| CC asks you to decide something covered in SPEC | "It's in SPEC §X. Implement that." |
| CC asks you to decide something NOT covered | Update SPEC.md or add to Open Questions §10, then answer. |

---

## Files in this handoff

- `CLAUDE.md` → repo root. Conventions, rules, hard limits. Read every session.
- `docs/SPEC.md` → repo root `docs/`. Functional spec, schema, API, acceptance criteria. The contract.
- `docs/KICKOFF.md` → this file. Reference for kicking off Sprint 0.

After Sprint 0 lands you may also want:

- `docs/DATA_MODEL.md` — ERD diagram + schema rationale (CC can generate from migrations)
- `docs/API.md` — endpoint catalog (CC can generate from OpenAPI spec)
- `docs/RUNBOOK.md` — deploy, rollback, restore, common ops
- `docs/BACKLOG.md` — out-of-scope items deferred to v2
