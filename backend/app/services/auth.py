from __future__ import annotations

from argon2 import PasswordHasher
from argon2 import exceptions as argon2_exc

_ph = PasswordHasher()


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(stored_hash: str, password: str) -> bool:
    try:
        _ph.verify(stored_hash, password)
        return True
    except (argon2_exc.VerifyMismatchError, argon2_exc.InvalidHashError):
        return False


def needs_rehash(stored_hash: str) -> bool:
    return _ph.check_needs_rehash(stored_hash)
