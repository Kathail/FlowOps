from __future__ import annotations

from app.errors import ConflictError

# Per docs/SPEC.md §3.5 — illegal transitions return 409.
#
# Terminal-state reopening: completed/cancelled accept transitions back to
# `open` only. Crews finish, supervisors review, and "we closed it but the
# leak came back" is real enough to warrant a path. The endpoint requires
# the admin role for these specific edges (see `is_reopen()`).
TRANSITIONS: dict[str, set[str]] = {
    "draft": {"open", "cancelled"},
    "open": {"assigned", "on_hold", "cancelled"},
    "assigned": {"in_progress", "on_hold", "cancelled"},
    "in_progress": {"completed", "on_hold"},
    "on_hold": {"open", "assigned", "in_progress", "cancelled"},
    "completed": {"open"},
    "cancelled": {"open"},
}

REOPEN_EDGES: set[tuple[str, str]] = {
    ("completed", "open"),
    ("cancelled", "open"),
}


def validate_transition(from_state: str, to_state: str) -> None:
    if to_state not in TRANSITIONS.get(from_state, set()):
        raise ConflictError(
            f"cannot transition work order from {from_state!r} to {to_state!r}",
            code="invalid_transition",
        )


def is_reopen(from_state: str, to_state: str) -> bool:
    """Out-of-terminal transitions need an admin gate at the API layer.

    The transitions table only encodes legality, not authorization, so the
    endpoint asks here whether a given edge is the kind that requires the
    elevated role check.
    """
    return (from_state, to_state) in REOPEN_EDGES
