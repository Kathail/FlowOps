from __future__ import annotations

from typing import Any, TypeVar

from pydantic import BaseModel
from pydantic import ValidationError as PydanticValidationError

from app.errors import ValidationError

M = TypeVar("M", bound=BaseModel)


def validate_request(model_cls: type[M], data: Any) -> M:
    """Validate a request payload against a Pydantic model.

    Hoisted out of every blueprint's local copy of `_validate(...)` so
    error formatting + the typed exception are consistent across the
    whole API surface. Pass the model class and the parsed JSON; get
    back the typed model or a `ValidationError` (which the global
    error handler turns into a 422 response).
    """
    try:
        return model_cls.model_validate(data)
    except PydanticValidationError as e:
        raise ValidationError(str(e.errors())) from e
