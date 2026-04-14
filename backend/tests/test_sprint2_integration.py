"""Integration tests for Sprint 2 complete workflows."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestBatchWorkflow:
    """Tests for complete batch workflow from creation to completion."""

    def test_full_batch_lifecycle(self):
        """Test complete batch lifecycle: create -> start -> pause -> resume -> complete."""
        # Create batch
        create_response = client.post(
            "/api/v1/batches",
            json={"store_id": "shopee-default-store", "trigger_type": "manual"},
        )
        assert create_response.status_code == 200
        batch_id = create_response.json()["data"]["id"]

        # Start batch
        start_response = client.post(f"/api/v1/batches/{batch_id}/start")
        assert start_response.status_code == 200
        assert start_response.json()["data"]["status"] == "running"

        # Pause batch
        pause_response = client.post(f"/api/v1/batches/{batch_id}/pause")
        assert pause_response.status_code == 200
        assert pause_response.json()["data"]["status"] == "paused"

        # Resume batch
        resume_response = client.post(f"/api/v1/batches/{batch_id}/resume")
        assert resume_response.status_code == 200
        assert resume_response.json()["data"]["status"] == "running"

        # Complete batch
        complete_response = client.post(f"/api/v1/batches/{batch_id}/complete")
        assert complete_response.status_code == 200
        assert complete_response.json()["data"]["status"] == "completed"

    def test_batch_with_multiple_items(self):
        """Test batch containing multiple items with different statuses."""
        # Create batch
        batch_response = client.post(
            "/api/v1/batches",
            json={"store_id": "shopee-default-store", "trigger_type": "manual"},
        )
        batch_id = batch_response.json()["data"]["id"]

        # Create multiple items
        item_ids = []
        for i in range(3):
            item_response = client.post(
                "/api/v1/opportunities",
                json={
                    "batch_id": batch_id,
                    "store_id": "shopee-default-store",
                    "score_total": 70 + i * 10,
                },
            )
            item_ids.append(item_response.json()["data"]["id"])

        # Verify all items belong to batch
        list_response = client.get(f"/api/v1/opportunities?batch_id={batch_id}")
        assert list_response.status_code == 200
        items = list_response.json()["data"]["items"]
        assert len(items) == 3


class TestOpportunityItemWorkflow:
    """Tests for complete opportunity item workflow."""

    def test_item_status_transitions(self):
        """Test item status transitions from discovered to shortlisted."""
        # Create batch and item
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

        # Verify initial status
        assert item_response.json()["data"]["status"] == "discovered"

        # Advance to shortlisted
        advance_response = client.post(f"/api/v1/opportunities/{item_id}/advance/shortlisted")
        assert advance_response.status_code == 200
        assert advance_response.json()["data"]["status"] == "shortlisted"

        # Verify status persistence
        get_response = client.get(f"/api/v1/opportunities/{item_id}")
        assert get_response.status_code == 200
        assert get_response.json()["data"]["status"] == "shortlisted"

    def test_item_with_supply_candidate(self):
        """Test item with supply candidate creation and retrieval."""
        # Create batch and item
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

        # Add supply candidate
        supply_response = client.post(
            f"/api/v1/opportunities/{item_id}/supply-candidates",
            json={
                "opportunity_item_id": item_id,
                "source_platform": "1688",
                "source_item_ref": "item-test-123",
                "cost_amount": 45.0,
                "moq": 10,
            },
        )
        assert supply_response.status_code == 200

        # Verify in item detail
        detail_response = client.get(f"/api/v1/opportunities/{item_id}/detail")
        assert detail_response.status_code == 200
        detail = detail_response.json()["data"]
        assert len(detail["supply_candidates"]) == 1
        assert detail["supply_candidates"][0]["source_platform"] == "1688"

    def test_item_with_category_mapping(self):
        """Test item with category mapping creation."""
        # Create batch and item
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

        # Create mapping
        mapping_response = client.post(
            f"/api/v1/opportunities/{item_id}/mapping",
            json={
                "opportunity_item_id": item_id,
                "category_ref": "cat-123",
                "attributes_payload": '{"color": "blue"}',
                "confidence_score": 0.85,
            },
        )
        assert mapping_response.status_code == 200

        # Verify in item detail
        detail_response = client.get(f"/api/v1/opportunities/{item_id}/detail")
        assert detail_response.status_code == 200
        detail = detail_response.json()["data"]
        assert len(detail["mappings"]) == 1


class TestPublishWorkflow:
    """Tests for complete publish workflow."""

    def test_publish_task_complete_cycle(self):
        """Test publish task from creation to completion."""
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
            json={
                "opportunity_item_id": item_id,
                "store_id": "shopee-default-store",
                "channel": "api",
            },
        )
        task_id = task_response.json()["data"]["id"]

        # Start task
        start_response = client.post(f"/api/v1/publish-tasks/{task_id}/start")
        assert start_response.status_code == 200
        assert start_response.json()["data"]["status"] == "running"

        # Complete task
        complete_response = client.post(
            f"/api/v1/publish-tasks/{task_id}/complete",
            json={"platform_item_ref": "shopee-item-xyz"},
        )
        assert complete_response.status_code == 200
        assert complete_response.json()["data"]["status"] == "succeeded"

    def test_publish_task_failure_and_retry(self):
        """Test publish task failure and retry handling."""
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
            json={
                "opportunity_item_id": item_id,
                "store_id": "shopee-default-store",
            },
        )
        task_id = task_response.json()["data"]["id"]

        # Fail task with retryable error
        fail_response = client.post(
            f"/api/v1/publish-tasks/{task_id}/fail",
            params={"error": "Rate limit exceeded", "retryable": "true"},
        )
        assert fail_response.status_code == 200
        assert fail_response.json()["data"]["status"] == "failed_retryable"


class TestProcurementWorkflow:
    """Tests for procurement draft workflow."""

    def test_procurement_draft_workflow(self):
        """Test procurement draft from creation to confirmation."""
        # Create batch and item
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

        # Create procurement draft
        draft_response = client.post(
            "/api/v1/procurement-drafts",
            json={
                "opportunity_item_id": item_id,
                "supplier_ref": "supplier-1688-001",
                "purchase_price": 50.00,
                "qty": 100,
            },
        )
        assert draft_response.status_code == 200
        draft_id = draft_response.json()["data"]["id"]

        # Submit for confirmation
        submit_response = client.post(f"/api/v1/procurement-drafts/{draft_id}/submit")
        assert submit_response.status_code == 200
        assert submit_response.json()["data"]["status"] == "awaiting_confirmation"

        # Confirm draft
        confirm_response = client.post(f"/api/v1/procurement-drafts/{draft_id}/confirm")
        assert confirm_response.status_code == 200
        assert confirm_response.json()["data"]["status"] == "confirmed"


class TestAgentRunWorkflow:
    """Tests for agent run tracking."""

    def test_agent_run_complete_workflow(self):
        """Test agent run from creation to completion."""
        # Create agent run
        run_response = client.post(
            "/api/v1/agent-runs",
            json={
                "agent_name": "sourcing",
                "entity_type": "opportunity_item",
                "entity_id": "item-test-001",
                "model_name": "gpt-4",
                "input_summary": "Scoring supply candidates",
            },
        )
        assert run_response.status_code == 200
        run_id = run_response.json()["data"]["id"]

        # Complete run
        complete_response = client.post(
            f"/api/v1/agent-runs/{run_id}/complete",
            json={
                "output_summary": "Selected best candidate",
                "evidence_payload": '{"score": 0.95}',
            },
        )
        assert complete_response.status_code == 200
        assert complete_response.json()["data"]["status"] == "completed"

        # Get runs for entity
        entity_runs = client.get("/api/v1/agent-runs/entity/opportunity_item/item-test-001")
        assert entity_runs.status_code == 200
        assert len(entity_runs.json()["data"]) >= 1
