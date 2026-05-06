from __future__ import annotations

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException


class CityWaterError(Exception):
    status_code: int = 500
    code: str = "internal_error"

    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        code: str | None = None,
    ) -> None:
        super().__init__(message)
        if status_code is not None:
            self.status_code = status_code
        if code is not None:
            self.code = code


class NotFoundError(CityWaterError):
    status_code = 404
    code = "not_found"


class ValidationError(CityWaterError):
    status_code = 422
    code = "validation_error"


class ConflictError(CityWaterError):
    status_code = 409
    code = "conflict"


class AuthError(CityWaterError):
    status_code = 401
    code = "unauthorized"


class ForbiddenError(CityWaterError):
    status_code = 403
    code = "forbidden"


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(CityWaterError)
    def _handle_app_error(err: CityWaterError):
        return (
            jsonify({"error": {"code": err.code, "message": str(err)}}),
            err.status_code,
        )

    @app.errorhandler(HTTPException)
    def _http(err: HTTPException):
        code = (err.name or "error").lower().replace(" ", "_")
        return (
            jsonify({"error": {"code": code, "message": err.description}}),
            err.code or 500,
        )
