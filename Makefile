.PHONY: help dev dev-stop test lint fmt db-upgrade db-revision seed clean

help:
	@echo "FlowOps make targets:"
	@echo "  dev          Start the local stack (postgres, redis, minio, pg_tileserv) in the background."
	@echo "  dev-stop     Stop the local stack."
	@echo "  test         Run backend + frontend tests."
	@echo "  lint         Run ruff + eslint."
	@echo "  fmt          Run ruff format + prettier."
	@echo "  db-upgrade   Apply pending Alembic migrations."
	@echo "  db-revision  Create a new migration. Usage: make db-revision NAME=add_assets"
	@echo "  seed         Seed the local DB (no-op in S0; asset class catalog lands in S2)."
	@echo "  clean        Remove caches and build artifacts."

dev:
	docker compose -f infra/docker-compose.yml up -d
	@echo ""
	@echo "Local stack up. Run the dev servers in two terminals:"
	@echo "  cd backend  && uv run flask --app app.wsgi run --debug --port 5000"
	@echo "  cd frontend && npm run dev"

dev-stop:
	docker compose -f infra/docker-compose.yml down

test:
	cd backend && uv run pytest
	cd frontend && npm test

lint:
	cd backend && uv run ruff check .
	cd frontend && npm run lint

fmt:
	cd backend && uv run ruff format .
	cd frontend && npm run format

db-upgrade:
	cd backend && uv run flask --app app.wsgi db upgrade

db-revision:
	@if [ -z "$(NAME)" ]; then echo "Usage: make db-revision NAME=<description>"; exit 1; fi
	cd backend && uv run flask --app app.wsgi db revision --autogenerate -m "$(NAME)"

seed:
	@echo "No seeds in S0 — asset class catalog seed lands in S2."

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .ruff_cache -exec rm -rf {} + 2>/dev/null || true
	rm -rf backend/dist backend/build backend/*.egg-info
	rm -rf frontend/dist frontend/.vite
