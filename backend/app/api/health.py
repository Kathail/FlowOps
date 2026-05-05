from __future__ import annotations

import logging

from flask import Blueprint, current_app, jsonify
from sqlalchemy import text

from app.extensions import db

log = logging.getLogger(__name__)

health_bp = Blueprint("health", __name__)


@health_bp.get("/healthz")
def healthz():
    settings = current_app.config["SETTINGS"]
    try:
        db.session.execute(text("SELECT 1"))
        db_status = "ok"
        status_code = 200
    except Exception:
        log.exception("healthz: db check failed")
        db_status = "error"
        status_code = 503
    return jsonify({"db": db_status, "version": settings.git_sha}), status_code
