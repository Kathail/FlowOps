from __future__ import annotations

import logging
import sys

from pythonjsonlogger import jsonlogger

from app.config import Settings


def configure_logging(settings: Settings) -> None:
    root = logging.getLogger()
    root.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    if settings.environment == "production":
        formatter: logging.Formatter = jsonlogger.JsonFormatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s",
        )
    else:
        formatter = logging.Formatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s",
        )
    handler.setFormatter(formatter)
    root.addHandler(handler)
    root.setLevel(settings.log_level.upper())
