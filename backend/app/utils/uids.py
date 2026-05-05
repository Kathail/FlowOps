from __future__ import annotations

import secrets


def generate_user_uid() -> str:
    """URL-safe short UID for users (CLAUDE.md hard rule #3 — no internal IDs in URLs)."""
    return secrets.token_urlsafe(8)
