"""AES-GCM encryption for OAuth tokens stored at rest.

Usage:
    from app.core.crypto import encrypt_token, decrypt_token

    ciphertext = encrypt_token("my-access-token")
    plaintext  = decrypt_token(ciphertext)

Requires TOKEN_ENCRYPTION_KEY env var (32-byte hex string).
In development mode, a derived default key is used (NOT safe for production).
"""

import os
from base64 import b64decode, b64encode

from app.core.config import settings

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError:
    AESGCM = None  # type: ignore[assignment]


def _get_key() -> bytes:
    """Derive a 32-byte AES key from settings or environment."""
    key_hex = settings.token_encryption_key or os.environ.get("TOKEN_ENCRYPTION_KEY", "")
    if key_hex:
        key = bytes.fromhex(key_hex)
        if len(key) != 32:
            raise ValueError("TOKEN_ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars)")
        return key

    if settings.app_env in ("development", "test"):
        # Derive a stable key from app name for dev/test only
        import hashlib
        return hashlib.sha256(f"{settings.app_name}-dev-token-key".encode()).digest()

    raise ValueError("TOKEN_ENCRYPTION_KEY must be set in production")


def encrypt_token(plaintext: str | None) -> str | None:
    """Encrypt a token string. Returns base64-encoded nonce+ciphertext, or None if input is None."""
    if plaintext is None:
        return None
    if AESGCM is None:
        # Fallback: if cryptography is not installed, store as-is with prefix
        # This should NEVER happen in production
        if settings.app_env not in ("development", "test"):
            raise RuntimeError("cryptography package is required for token encryption in production")
        return f"plain:{plaintext}"

    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return b64encode(nonce + ciphertext).decode("ascii")


def decrypt_token(stored: str | None) -> str | None:
    """Decrypt a token string. Returns the plaintext, or None if input is None."""
    if stored is None:
        return None
    if stored.startswith("plain:"):
        if settings.app_env not in ("development", "test"):
            raise RuntimeError("Plaintext tokens found in production — run migration to encrypt")
        return stored[6:]

    if AESGCM is None:
        if settings.app_env not in ("development", "test"):
            raise RuntimeError("cryptography package is required for token encryption in production")
        return stored

    key = _get_key()
    aesgcm = AESGCM(key)
    raw = b64decode(stored)
    nonce = raw[:12]
    ciphertext = raw[12:]
    return aesgcm.decrypt(nonce, ciphertext, None).decode("utf-8")
