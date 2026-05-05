from __future__ import annotations

from flask import Flask

from app.api.health import health_bp
from app.config import Settings
from app.errors import register_error_handlers
from app.extensions import db, migrate
from app.logging import configure_logging


def create_app(settings: Settings | None = None) -> Flask:
    settings = settings or Settings()
    configure_logging(settings)

    app = Flask(__name__)
    app.config["SETTINGS"] = settings
    app.config["SECRET_KEY"] = settings.secret_key
    app.config["SQLALCHEMY_DATABASE_URI"] = settings.database_url
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_pre_ping": True}

    db.init_app(app)
    migrate.init_app(app, db)

    register_error_handlers(app)
    app.register_blueprint(health_bp)

    return app
