from __future__ import annotations

import os

import pytest
from pytest_postgresql import factories
from sqlalchemy import text

from app import create_app
from app.config import Settings
from app.extensions import db as _db

_PG_HOST = os.environ.get("PGHOST", "localhost")
_PG_PORT = int(os.environ.get("PGPORT", "5432"))
_PG_USER = os.environ.get("PGUSER", "flowops")
_PG_PASSWORD = os.environ.get("PGPASSWORD", "flowops")

postgresql_proc = factories.postgresql_noproc(
    host=_PG_HOST,
    port=_PG_PORT,
    user=_PG_USER,
    password=_PG_PASSWORD,
)
postgresql = factories.postgresql("postgresql_proc")


@pytest.fixture
def app(postgresql):
    info = postgresql.info
    url = f"postgresql+psycopg://{info.user}:{_PG_PASSWORD}@{info.host}:{info.port}/{info.dbname}"
    settings = Settings(database_url=url, environment="test", git_sha="test-sha")
    flask_app = create_app(settings)
    with flask_app.app_context():
        _db.session.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        _db.session.commit()
        yield flask_app


@pytest.fixture
def client(app):
    return app.test_client()
