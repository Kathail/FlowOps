# CityWater

Asset & work management for water distribution, wastewater collection, and storm drainage.

**Status:** Live in production at [citywater.ca](https://citywater.ca) (marketing) and [app.citywater.ca](https://app.citywater.ca) (app). Try the demo: [app.citywater.ca/try-demo](https://app.citywater.ca/try-demo).

See `CLAUDE.md` for conventions and `docs/SPEC.md` for the functional spec.

## Prerequisites

- Docker + Docker Compose (postgres, redis, minio, pg_tileserv run as containers)
- Python 3.12 with [`uv`](https://github.com/astral-sh/uv) (`pip install uv`)
- Node.js 20 LTS + npm
- GNU Make

## Port map

| Service       | Port  | Notes                                      |
|---------------|------:|--------------------------------------------|
| Backend       | 5000  | Flask dev server / gunicorn in prod        |
| Frontend      | 5173  | Vite dev server (proxies `/api`, `/healthz`)|
| Marketing     | 5174  | Static brochure served via Vite preview     |
| Postgres      | 5432  | PostGIS-enabled                            |
| Redis         | 6379  |                                            |
| MinIO         | 9000  | S3-compatible API                          |
| MinIO console | 9001  |                                            |
| pg_tileserv   | 7800  | Vector tiles                               |

## First-run

```sh
# 1. Start infra (postgres, redis, minio, pg_tileserv)
make dev

# 2. Backend setup (in a new terminal)
cd backend
cp .env.example .env
uv sync                                       # install python deps
uv run flask --app app.wsgi db upgrade        # run migrations (creates PostGIS extension)
uv run flask --app app.wsgi seed-demo         # optional: load the demo tenant
uv run flask --app app.wsgi run --debug --port 5000

# 3. Frontend setup (in another terminal)
cd frontend
cp .env.example .env
npm install
npm run dev

# 4. Marketing brochure (optional, in another terminal)
cd marketing
npm install
npm run dev
```

Open http://localhost:5173 — you'll land on the login page. Register a tenant first at `/register`, then sign in. After running `seed-demo` you can also hit `/try-demo` for a one-click sandbox login.

## Common commands

```sh
make test               # backend + frontend tests
make lint               # ruff + eslint
make fmt                # ruff format + prettier
make db-upgrade         # apply pending migrations
make db-revision NAME=add_assets   # autogenerate a new migration
make seed-demo          # seed the demo tenant (admin@demo.citywater.io / DemoPassword123!)
make simulate-year      # backfill a year of synthetic activity into the demo tenant
make clean              # remove caches + builds
make dev-stop           # tear down the local stack
```

## Repo layout

```
backend/      Flask app, SQLAlchemy models, Alembic migrations, pytest
frontend/     Vite + React 18 + TypeScript + Tailwind (the product UI)
marketing/    Static brochure for citywater.ca (Tailwind v4, no JS framework)
infra/        docker-compose, pg_tileserv config, railway.toml
docs/         SPEC.md, DATA_MODEL.md, API.md, DEPLOY.md, RUNBOOKS.md, HANDOFF.md
.github/      CI workflows
```

## Documentation

- `docs/SPEC.md` — functional spec, schema decisions, AC checklists
- `docs/DATA_MODEL.md` — ERD overview, asset class catalog, JSONB schemas
- `docs/API.md` — endpoint catalog (auto-discoverable at `/api/v1/openapi.json` once running)
- `docs/DEPLOY.md` — Railway deployment runbook
- `docs/RUNBOOKS.md` — operational runbooks (audit-log retention, data backups, etc.)
- `docs/HANDOFF.md` — current state of the codebase between work sessions

## Deployment

Production runs on Railway. See `docs/DEPLOY.md`. Five services:

1. **marketing** — `marketing/` Docker image at citywater.ca
2. **frontend** — `frontend/` Docker image at app.citywater.ca (nginx serves the SPA + proxies `/api/*` to backend over the private network)
3. **backend** — `backend/` Docker image (Flask + gunicorn, runs `flask db upgrade` on boot)
4. **PostgreSQL + PostGIS** — Railway template
5. **Redis** — Flask-Limiter rate-limit storage
