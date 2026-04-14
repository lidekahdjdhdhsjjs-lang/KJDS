"""Tests for API security enhancements."""

import json
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings

client = TestClient(app)

OPERATOR_HEADERS = {
    "x-operator-id": "test-operator",
    "x-operator-role": "operator",
}

ADMIN_HEADERS = {
    "x-operator-id": "test-admin",
    "x-operator-role": "admin",
}


class TestInputValidation:
    def test_invalid_json_in_mapping_returns_422(self):
        item_resp = client.post(
            "/api/v1/opportunities",
            json={
                "batch_id": "batch-001",
                "store_id": "store-001",
            },
            headers=OPERATOR_HEADERS,
        )
        item_id = item_resp.json()["data"]["id"]
        response = client.post(
            f"/api/v1/opportunities/{item_id}/mapping",
            json={
                "opportunity_item_id": item_id,
                "category_ref": "cat-001",
                "attributes_payload": "not-valid-json{{{",
                "confidence_score": 0.9,
            },
            headers=OPERATOR_HEADERS,
        )
        assert response.status_code == 422
        assert "Invalid JSON payload" in response.json()["detail"]

    def test_invalid_json_in_content_returns_422(self):
        item_resp = client.post(
            "/api/v1/opportunities",
            json={
                "batch_id": "batch-001",
                "store_id": "store-001",
            },
            headers=OPERATOR_HEADERS,
        )
        item_id = item_resp.json()["data"]["id"]
        response = client.post(
            f"/api/v1/opportunities/{item_id}/content",
            json={
                "opportunity_item_id": item_id,
                "title": "Test",
                "bullet_points": "not-valid-json{{{",
                "locale": "zh-CN",
            },
            headers=OPERATOR_HEADERS,
        )
        assert response.status_code == 422
        assert "Invalid JSON payload" in response.json()["detail"]

    def test_invalid_json_in_pricing_returns_422(self):
        item_resp = client.post(
            "/api/v1/opportunities",
            json={
                "batch_id": "batch-001",
                "store_id": "store-001",
            },
            headers=OPERATOR_HEADERS,
        )
        item_id = item_resp.json()["data"]["id"]
        response = client.post(
            f"/api/v1/opportunities/{item_id}/pricing",
            json={
                "opportunity_item_id": item_id,
                "cost_payload": "not-valid-json{{{",
                "fee_payload": "{}",
                "exchange_rate_payload": "{}",
                "suggested_price": 10.0,
                "min_profit_line": 5.0,
                "decision_reason": "test",
            },
            headers=OPERATOR_HEADERS,
        )
        assert response.status_code == 422
        assert "Invalid JSON payload" in response.json()["detail"]

    def test_invalid_json_in_feedback_returns_422(self):
        response = client.post(
            "/api/v1/feedback-records",
            json={
                "opportunity_item_id": "item-001",
                "feedback_type": "content_fix",
                "source_type": "operator",
                "before_payload": "not-valid-json{{{",
                "after_payload": "{}",
            },
            headers=OPERATOR_HEADERS,
        )
        assert response.status_code == 422
        assert "Invalid JSON payload" in response.json()["detail"]


class TestPaginationValidation:
    def test_limit_cannot_exceed_500(self):
        response = client.get(
            "/api/v1/batches?limit=1000",
            headers=OPERATOR_HEADERS,
        )
        assert response.status_code == 422

    def test_limit_cannot_be_zero(self):
        response = client.get(
            "/api/v1/batches?limit=0",
            headers=OPERATOR_HEADERS,
        )
        assert response.status_code == 422

    def test_offset_cannot_be_negative(self):
        response = client.get(
            "/api/v1/batches?offset=-1",
            headers=OPERATOR_HEADERS,
        )
        assert response.status_code == 422

    def test_valid_pagination_works(self):
        response = client.get(
            "/api/v1/batches?limit=10&offset=0",
            headers=OPERATOR_HEADERS,
        )
        assert response.status_code == 200


class TestHTTPStatusCodes:
    def test_incident_not_found_returns_404(self):
        response = client.get(
            "/api/v1/incidents/nonexistent-id",
            headers=OPERATOR_HEADERS,
        )
        assert response.status_code == 404

    def test_store_health_not_found_returns_404(self):
        response = client.get(
            "/api/v1/store-health/nonexistent-store",
            headers=OPERATOR_HEADERS,
        )
        assert response.status_code == 404

    def test_feedback_not_found_returns_404(self):
        response = client.get(
            "/api/v1/feedback-records/nonexistent-id",
            headers=OPERATOR_HEADERS,
        )
        assert response.status_code == 404


class TestAPIKeyAuth:
    def test_api_key_auth_with_query_param(self):
        original_env = settings.app_env
        original_key = settings.api_key
        try:
            settings.app_env = "production"
            settings.api_key = "test-api-key-123"
            response = client.get(
                "/api/v1/dashboard/summary?api_key=test-api-key-123",
            )
            assert response.status_code == 200
        finally:
            settings.app_env = original_env
            settings.api_key = original_key

    def test_api_key_auth_with_bearer_token(self):
        original_env = settings.app_env
        original_key = settings.api_key
        try:
            settings.app_env = "production"
            settings.api_key = "test-api-key-123"
            response = client.get(
                "/api/v1/dashboard/summary",
                headers={"Authorization": "Bearer test-api-key-123"},
            )
            assert response.status_code == 200
        finally:
            settings.app_env = original_env
            settings.api_key = original_key

    def test_wrong_api_key_returns_401(self):
        original_env = settings.app_env
        original_key = settings.api_key
        try:
            settings.app_env = "production"
            settings.api_key = "test-api-key-123"
            response = client.get(
                "/api/v1/dashboard/summary?api_key=wrong-key",
            )
            assert response.status_code == 401
        finally:
            settings.app_env = original_env
            settings.api_key = original_key

    def test_no_auth_in_production_returns_401(self):
        original_env = settings.app_env
        try:
            settings.app_env = "production"
            response = client.get("/api/v1/dashboard/summary")
            assert response.status_code == 401
        finally:
            settings.app_env = original_env
