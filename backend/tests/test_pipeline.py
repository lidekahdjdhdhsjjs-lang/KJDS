"""End-to-end tests for the auto pipeline."""

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

client = TestClient(app)

OPERATOR_HEADERS = {
    "x-operator-id": "test-operator",
    "x-operator-role": "operator",
}


class TestAutoPipeline:
    def test_run_pipeline_for_discovered_item(self):
        item_resp = client.post(
            "/api/v1/opportunities",
            json={"batch_id": "batch-e2e", "store_id": "store-e2e"},
            headers=OPERATOR_HEADERS,
        )
        assert item_resp.status_code == 200
        item_id = item_resp.json()["data"]["id"]

        pipeline_resp = client.post(
            f"/api/v1/pipeline/run/{item_id}",
            headers=OPERATOR_HEADERS,
        )
        assert pipeline_resp.status_code == 200
        data = pipeline_resp.json()["data"]
        assert data["item_id"] == item_id
        assert data["status"] in ("success", "needs_human")
        assert len(data["steps"]) > 0

    def test_run_pipeline_for_nonexistent_item(self):
        resp = client.post(
            "/api/v1/pipeline/run/nonexistent-id",
            headers=OPERATOR_HEADERS,
        )
        assert resp.status_code == 404

    def test_run_batch_pipeline(self):
        for i in range(3):
            client.post(
                "/api/v1/opportunities",
                json={"batch_id": "batch-batch-e2e", "store_id": f"store-{i}"},
                headers=OPERATOR_HEADERS,
            )

        resp = client.post(
            "/api/v1/pipeline/run-batch/batch-batch-e2e",
            headers=OPERATOR_HEADERS,
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["total"] >= 3
        assert "success" in data
        assert "needs_human" in data

    def test_pipeline_requires_auth(self):
        original_env = settings.app_env
        try:
            settings.app_env = "production"
            resp = client.post("/api/v1/pipeline/run/some-id")
            assert resp.status_code == 401
        finally:
            settings.app_env = original_env

    def test_pipeline_steps_include_scoring(self):
        item_resp = client.post(
            "/api/v1/opportunities",
            json={"batch_id": "batch-steps", "store_id": "store-steps"},
            headers=OPERATOR_HEADERS,
        )
        item_id = item_resp.json()["data"]["id"]

        pipeline_resp = client.post(
            f"/api/v1/pipeline/run/{item_id}",
            headers=OPERATOR_HEADERS,
        )
        data = pipeline_resp.json()["data"]
        step_names = [s["name"] for s in data["steps"]]
        assert "auto_score" in step_names

    def test_pipeline_creates_incident_on_failure(self):
        item_resp = client.post(
            "/api/v1/opportunities",
            json={"batch_id": "batch-incident", "store_id": "store-incident"},
            headers=OPERATOR_HEADERS,
        )
        item_id = item_resp.json()["data"]["id"]

        client.post(
            f"/api/v1/pipeline/run/{item_id}",
            headers=OPERATOR_HEADERS,
        )

        incidents_resp = client.get(
            "/api/v1/incidents",
            headers=OPERATOR_HEADERS,
        )
        assert incidents_resp.status_code == 200
