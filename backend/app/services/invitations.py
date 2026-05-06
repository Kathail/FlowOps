"""Token generation + verification for tenant invitations.

Tokens are URL-safe random strings; we store an Argon2 hash in the DB so
even a database leak can't be used to accept the invite. The first 8
characters of the raw token are stored separately as `token_prefix` so the
admin UI can show "INV-abcd1234..." for human reference and lookups stay
indexed.
"""

from __future__ import annotations

import secrets

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

_TOKEN_BYTES = 32  # → 43-char URL-safe string
_PREFIX_LEN = 8

# Reuse Argon2id defaults. Tokens are short-lived so we don't need the
# tuned parameters of password hashing — defaults are plenty.
_hasher = PasswordHasher()


def generate_token() -> tuple[str, str, str]:
    """Return (raw_token, token_hash, token_prefix)."""
    token = secrets.token_urlsafe(_TOKEN_BYTES)
    token_hash = _hasher.hash(token)
    prefix = token[:_PREFIX_LEN]
    return token, token_hash, prefix


def verify_token(token: str, token_hash: str) -> bool:
    try:
        return _hasher.verify(token_hash, token)
    except VerifyMismatchError:
        return False


def token_prefix(token: str) -> str:
    return token[:_PREFIX_LEN]
