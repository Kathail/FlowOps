"""`flask schedules-tick` — fan out due schedules across all tenants.

Cron-driven entry point. Runs every hour in production. Sets
`g.skip_tenant_filter = True` and processes all active schedules with
`next_run_at <= now`. Failures on individual schedules are logged and skipped
so one bad rrule doesn't kill the whole tick.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

import click
from flask import Flask
from flask.cli import with_appcontext

from app.services.schedules import tick

logger = logging.getLogger(__name__)


def register(app: Flask) -> None:
    @app.cli.command("schedules-tick")
    @with_appcontext
    def schedules_tick() -> None:
        """Process every due schedule. Cron entry-point."""
        now = datetime.now(UTC)
        summary = tick(now)
        click.echo(
            f"[schedules-tick {now.isoformat()}] processed="
            f"{summary['schedules_processed']} fired={summary['fired']} "
            f"instances={','.join(summary['instances']) or '-'}"
        )
