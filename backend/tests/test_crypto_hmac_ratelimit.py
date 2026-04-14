"""Tests for crypto, HMAC state verification, and rate limiting."""

import hashlib
import time

import pytest

from app.core.crypto import _get_key, decrypt_token, encrypt_token


class TestCrypto:
    """Tests for AES-GCM token encryption/decryption."""

    def test_encrypt_decrypt_roundtrip(self):
        """Encrypting then decrypting returns the original plaintext."""
        plaintext = "shopee-access-token-abc123"
        encrypted = encrypt_token(plaintext)
        assert encrypted is not None
        assert encrypted != plaintext
        decrypted = decrypt_token(encrypted)
        assert decrypted == plaintext

    def test_encrypt_none_returns_none(self):
        assert encrypt_token(None) is None

    def test_decrypt_none_returns_none(self):
        assert decrypt_token(None) is None

    def test_decrypt_plain_prefix_in_dev_mode(self):
        """In dev/test mode, plain: prefix tokens are readable."""
        decrypted = decrypt_token("plain:my-dev-token")
        assert decrypted == "my-dev-token"

    def test_encrypt_produces_different_ciphertexts(self):
        """Each encryption uses a random nonce, so ciphertexts differ when AESGCM is available."""
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM as _AESGCM
        if _AESGCM is None:
            pytest.skip("cryptography package not installed")

        plaintext = "same-input"
        encrypted1 = encrypt_token(plaintext)
        encrypted2 = encrypt_token(plaintext)
        assert encrypted1 != encrypted2
        # Both should still decrypt to the same value
        assert decrypt_token(encrypted1) == plaintext
        assert decrypt_token(encrypted2) == plaintext

    def test_get_key_in_test_mode(self):
        """In test mode, key is derived from app name and is 32 bytes."""
        key = _get_key()
        assert len(key) == 32

    def test_empty_string_encryption(self):
        """Empty strings can be encrypted and decrypted."""
        encrypted = encrypt_token("")
        assert encrypted is not None
        decrypted = decrypt_token(encrypted)
        assert decrypted == ""

    def test_long_token_encryption(self):
        """Long tokens (like real OAuth tokens) can be encrypted and decrypted."""
        plaintext = "a" * 500
        encrypted = encrypt_token(plaintext)
        decrypted = decrypt_token(encrypted)
        assert decrypted == plaintext


class TestHMACStateVerification:
    """Tests for HMAC state token generation and verification."""

    def test_generate_and_verify_valid_state(self):
        """A freshly generated state token should pass verification."""
        from app.services.platform_connections import _generate_state_token, _verify_state_token

        state = _generate_state_token("shopee")
        # Should not raise
        _verify_state_token("shopee", state)

    def test_verify_wrong_platform_fails(self):
        """State token generated for one platform should fail for another."""
        from app.services.platform_connections import _generate_state_token, _verify_state_token

        state = _generate_state_token("shopee")
        with pytest.raises(ValueError, match="Invalid state token signature"):
            _verify_state_token("1688", state)

    def test_verify_tampered_signature_fails(self):
        """A modified signature should fail verification."""
        from app.services.platform_connections import _generate_state_token, _verify_state_token

        state = _generate_state_token("shopee")
        parts = state.split(".")
        # Tamper with the signature
        parts[2] = "0" * 64
        tampered = ".".join(parts)
        with pytest.raises(ValueError, match="Invalid state token signature"):
            _verify_state_token("shopee", tampered)

    def test_verify_expired_token_fails(self):
        """A state token with an expired timestamp should fail."""
        from app.services.platform_connections import _verify_state_token

        # Create a token that expired 1 hour ago
        from hmac import new as hmac_new
        from hashlib import sha256
        from app.services.platform_connections import _state_secret

        nonce = "testnonce123"
        expired_at = str(int(time.time()) - 3600)  # 1 hour ago
        payload = f"shopee:{nonce}:{expired_at}"
        sig = hmac_new(_state_secret().encode(), payload.encode(), sha256).hexdigest()
        expired_state = f"{nonce}.{expired_at}.{sig}"

        with pytest.raises(ValueError, match="State token has expired"):
            _verify_state_token("shopee", expired_state)

    def test_verify_invalid_format_fails(self):
        """State tokens with wrong format should fail."""
        from app.services.platform_connections import _verify_state_token

        with pytest.raises(ValueError, match="Invalid state token format"):
            _verify_state_token("shopee", "not-a-valid-state")

    def test_verify_invalid_expiry_fails(self):
        """State tokens with non-numeric expiry should fail."""
        from app.services.platform_connections import _verify_state_token

        with pytest.raises(ValueError, match="Invalid state token expiry"):
            _verify_state_token("shopee", "nonce.notanumber.signature")


class TestRateLimiting:
    """Tests for the in-memory rate limiter on the status endpoint."""

    def test_status_endpoint_returns_200_within_limit(self):
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.get("/api/v1/platform-connections/shopee/status")
        # Should succeed (within rate limit)
        assert response.status_code == 200

    def test_rate_limit_headers_or_429_on_excess(self):
        """Verify rate limiter kicks in after many requests."""
        from fastapi.testclient import TestClient
        from app.main import app
        from app.api.routes.platform_connections import _status_request_counts

        # Reset rate limiter state
        _status_request_counts.clear()

        client = TestClient(app)
        got_429 = False
        for i in range(35):
            response = client.get("/api/v1/platform-connections/shopee/status")
            if response.status_code == 429:
                got_429 = True
                break

        # Clean up
        _status_request_counts.clear()

        assert got_429, "Rate limiter should return 429 after exceeding 30 requests per minute"


class TestPlatformConnectionsRouteOrdering:
    """Tests that /stores routes are not shadowed by /{platform} routes."""

    def test_stores_endpoint_not_shadowed(self):
        """GET /platform-connections/stores should route to list_stores, not treat 'stores' as a platform."""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.get(
            "/api/v1/platform-connections/stores",
            headers={"x-operator-id": "test-op", "x-operator-role": "operator"},
        )
        # Should get 200 (list stores), not 422 (invalid platform name)
        assert response.status_code != 422
