# CityWater

Asset & work management for water distribution, wastewater collection, and storm drainage.

Status: Sprint 1 complete (auth & multi-tenancy). See `CLAUDE.md` for conventions and `docs/SPEC.md` for the functional spec.

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
uv run flask --app app.wsgi run --debug --port 5000

# 3. Frontend setup (in another terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173 — you'll land on the login page. Register a tenant first at `/register`, then sign in. The healthz endpoint is still at http://localhost:5000/healthz.

## Common commands

```sh
make test          # backend + frontend tests
make lint          # ruff + eslint
make fmt           # ruff format + prettier
make db-upgrade    # apply pending migrations
make db-revision NAME=add_assets   # autogenerate a new migration
make seed          # no-op in S0
make clean         # remove caches + builds
make dev-stop      # tear down the local stack
```

## Repo layout

```
backend/    Flask app, SQLAlchemy models, Alembic migrations, pytest
frontend/   Vite + React 18 + TypeScript + Tailwind
infra/      docker-compose, pg_tileserv config, railway.toml
docs/       SPEC.md (the contract), KICKOFF.md
```

## Next sprint

S2 — Asset class catalog + asset CRUD (Epic 2). See `docs/SPEC.md` §9 for the build order.
