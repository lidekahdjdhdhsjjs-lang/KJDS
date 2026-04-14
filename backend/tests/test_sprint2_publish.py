"""Tests for Sprint 2 publish task management."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestPublishTaskEndpoints:
    """Tests for publish task API endpoints."""

    def test_create_task(self):
        """Test creating a new publish task."""
        # Create batch and item first
        batch_response = client.post(
            "/api/v1/batches",
            json={"store_id": "shopee-default-store", "trigger_type": "manual"},
        )
        batch_id = batch_response.json()["data"]["id"]
        item_response = client.post(
            "/api/v1/opportunities",
            json={"batch_id": batch_id, "store_id": "shopee-default-store"},
        )
        item_id = item_response.json()["data"]["id"]

        response = client.post(
            "/api/v1/publish-tasks",
            json={
                "opportunity_item_id": item_id,
                "store_id": "shopee-default-store",
                "channel": "api",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["opportunity_item_id"] == item_id
        assert data["data"]["status"] == "pending"

    def test_list_tasks(self):
        """Test listing tasks."""
        response = client.get("/api/v1/publish-tasks")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"]["items"], list)

    def test_get_task(self):
        """Test getting a specific task."""
        # Create batch, item, and task
        batch_response = client.post(
            "/api/v1/batches",
            json={"store_id": "shopee-default-store", "trigger_type": "manual"},
        )
        batch_id = batch_response.json()["data"]["id"]
        item_response = client.post(
            "/api/v1/opportunities",
            json={"batch_id": batch_id, "store_id": "shopee-default-store"},
        )
        item_id = item_response.json()["data"]["id"]
        task_response = client.post(
            "/api/v1/publish-tasks",
            json={"opportunity_item_id": item_id, "store_id": "shopee-default-store"},
        )
        task_id = task_response.json()["data"]["id"]

        response = client.get(f"/api/v1/publish-tasks/{task_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["id"] == task_id

    def test_start_task(self):
        """Test starting a task."""
        # Create batch, item, and task
        batch_response = client.post(
            "/api/v1/batches",
            json={"store_id": "shopee-default-store", "trigger_type": "manual"},
        )
        batch_id = batch_response.json()["data"]["id"]
        item_response = client.post(
            "/api/v1/opportunities",
            json={"batch_id": batch_id, "store_id": "shopee-default-store"},
        )
        item_id = item_response.json()["data"]["id"]
        task_response = client.post(
            "/api/v1/publish-tasks",
            json={"opportunity_item_id": item_id, "store_id": "shopee-default-store"},
        )
        task_id = task_response.json()["data"]["id"]

        response = client.post(f"/api/v1/publish-tasks/{task_id}/start")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "running"

    def test_complete_task(self):
        """Test completing a task."""
        # Create batch, item, and task
        batch_response = client.post(
            "/api/v1/batches",
            json={"store_id": "shopee-default-store", "trigger_type": "manual"},
        )
        batch_id = batch_response.json()["data"]["id"]
        item_response = client.post(
            "/api/v1/opportunities",
            json={"batch_id": batch_id, "store_id": "shopee-default-store"},
        )
        item_id = item_response.json()["data"]["id"]
        task_response = client.post(
            "/api/v1/publish-tasks",
            json={"opportunity_item_id": item_id, "store_id": "shopee-default-store"},
        )
        task_id = task_response.json()["data"]["id"]

        response = client.post(
            f"/api/v1/publish-tasks/{task_id}/complete",
            json={"platform_item_ref": "shopee-item-123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "succeeded"

    def test_fail_task(self):
        """Test failing a task."""
        # Create batch, item, and task
        batch_response = client.post(
            "/api/v1/batches",
            json={"store_id": "shopee-default-store", "trigger_type": "manual"},
        )
        batch_id = batch_response.json()["data"]["id"]
        item_response = client.post(
            "/api/v1/opportunities",
            json={"batch_id": batch_id, "store_id": "shopee-default-store"},
        )
        item_id = item_response.json()["data"]["id"]
        task_response = client.post(
            "/api/v1/publish-tasks",
            json={"opportunity_item_id": item_id, "store_id": "shopee-default-store"},
        )
        task_id = task_response.json()["data"]["id"]

        response = client.post(
            f"/api/v1/publish-tasks/{task_id}/fail",
            params={"error": "API error", "retryable": "true"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "failed_retryable"


class TestProcurementDraftEndpoints:
    """Tests for procurement draft API endpoints."""

    def test_create_draft(self):
        """Test creating a procurement draft."""
        # Create batch and item first
        batch_response = client.post(
            "/api/v1/batches",
            json={"store_id": "shopee-default-store", "trigger_type": "manual"},
        )
        batch_id = batch_response.json()["data"]["id"]
        item_response = client.post(
            "/api/v1/opportunities",
            json={"batch_id": batch_id, "store_id": "shopee-default-store"},
        )
        item_id = item_response.json()["data"]["id"]

        response = client.post(
            "/api/v1/procurement-drafts",
            json={
                "opportunity_item_id": item_id,
                "supplier_ref": "1688-supplier-123",
                "purchase_price": 45.50,
                "qty": 100,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["supplier_ref"] == "1688-supplier-123"

    def test_list_drafts(self):
        """Test listing drafts."""
        response = client.get("/api/v1/procurement-drafts")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"]["items"], list)

    def test_submit_for_confirmation(self):
        """Test submitting a draft for confirmation."""
        # Create batch, item, and draft
        batch_response = client.post(
            "/api/v1/batches",
            json={"store_id": "shopee-default-store", "trigger_type": "manual"},
        )
        batch_id = batch_response.json()["data"]["id"]
        item_response = client.post(
            "/api/v1/opportunities",
            json={"batch_id": batch_id, "store_id": "shopee-default-store"},
        )
        item_id = item_response.json()["data"]["id"]
        draft_response = client.post(
            "/api/v1/procurement-drafts",
            json={
                "opportunity_item_id": item_id,
                "supplier_ref": "1688-supplier-123",
                "purchase_price": 45.50,
            },
        )
        draft_id = draft_response.json()["data"]["id"]

        response = client.post(f"/api/v1/procurement-drafts/{draft_id}/submit")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "awaiting_confirmation"

    def test_confirm_draft(self):
        """Test confirming a draft."""
        # Create batch, item, draft, and submit
        batch_response = client.post(
            "/api/v1/batches",
            json={"store_id": "shopee-default-store", "trigger_type": "manual"},
        )
        batch_id = batch_response.json()["data"]["id"]
        item_response = client.post(
            "/api/v1/opportunities",
            json={"batch_id": batch_id, "store_id": "shopee-default-store"},
        )
        item_id = item_response.json()["data"]["id"]
        draft_response = client.post(
            "/api/v1/procurement-drafts",
            json={
                "opportunity_item_id": item_id,
                "supplier_ref": "1688-supplier-123",
                "purchase_price": 45.50,
            },
        )
        draft_id = draft_response.json()["data"]["id"]
        client.post(f"/api/v1/procurement-drafts/{draft_id}/submit")

        response = client.post(f"/api/v1/procurement-drafts/{draft_id}/confirm")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "confirmed"


class TestAgentRunEndpoints:
    """Tests for agent run API endpoints."""

    def test_create_run(self):
        """Test creating an agent run."""
        response = client.post(
            "/api/v1/agent-runs",
            json={
                "agent_name": "sourcing",
                "entity_type": "opportunity_item",
                "entity_id": "item-123",
                "model_name": "gpt-4",
                "input_summary": "Scoring supply candidates",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["agent_name"] == "sourcing"

    def test_list_runs(self):
        """Test listing agent runs."""
        response = client.get("/api/v1/agent-runs")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"]["items"], list)

    def test_complete_run(self):
        """Test completing an agent run."""
        # Create a run
        run_response = client.post(
            "/api/v1/agent-runs",
            json={
                "agent_name": "sourcing",
                "entity_type": "opportunity_item",
                "entity_id": "item-123",
            },
        )
        run_id = run_response.json()["data"]["id"]

        response = client.post(
            f"/api/v1/agent-runs/{run_id}/complete",
            json={
                "output_summary": "Selected best candidate",
                "evidence_payload": '{"score": 0.95}',
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "completed"

    def test_fail_run(self):
        """Test failing an agent run."""
        # Create a run
        run_response = client.post(
            "/api/v1/agent-runs",
            json={
                "agent_name": "sourcing",
                "entity_type": "opportunity_item",
                "entity_id": "item-123",
            },
        )
        run_id = run_response.json()["data"]["id"]

        response = client.post(
            f"/api/v1/agent-runs/{run_id}/fail",
            params={"output_summary": "API timeout"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "failed"

    def test_get_runs_for_entity(self):
        """Test getting runs for an entity."""
        # Create some runs
        client.post(
            "/api/v1/agent-runs",
            json={
                "agent_name": "sourcing",
                "entity_type": "opportunity_item",
                "entity_id": "item-test-123",
            },
        )

        response = client.get("/api/v1/agent-runs/entity/opportunity_item/item-test-123")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)
