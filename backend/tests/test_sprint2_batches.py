"""Tests for Sprint 2 batch management."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestBatchEndpoints:
    """Tests for batch API endpoints."""

    def test_create_batch(self):
        """Test creating a new batch."""
        response = client.post(
            "/api/v1/batches",
            json={
                "store_id": "shopee-default-store",
                "trigger_type": "manual",
                "trigger_payload": '{"source": "test"}',
                "priority": 1,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["store_id"] == "shopee-default-store"
        assert data["data"]["trigger_type"] == "manual"
        assert data["data"]["status"] == "draft"

    def test_list_batches(self):
        """Test listing batches."""
        # Create a batch first
        client.post(
            "/api/v1/batches",
            json={"store_id": "shopee-default-store", "trigger_type": "manual"},
        )

        response = client.get("/api/v1/batches")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"]["items"], list)

    def test_get_batch(self):
        """Test getting a specific batch."""
        # Create a batch
        create_response = client.post(
            "/api/v1/batches",
            json={"store_id": "shopee-default-store", "trigger_type": "manual"},
        )
        batch_id = create_response.json()["data"]["id"]

        # Get the batch
        response = client.get(f"/api/v1/batches/{batch_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["id"] == batch_id

    def test_start_batch(self):
        """Test starting a batch."""
        # Create a batch
        create_response = client.post(
            "/api/v1/batches",
            json={"store_id": "shopee-default-store", "trigger_type": "manual"},
        )
        batch_id = create_response.json()["data"]["id"]

        # Start the batch
        response = client.post(f"/api/v1/batches/{batch_id}/start")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "running"

    def test_pause_batch(self):
        """Test pausing a batch."""
        # Create and start a batch
        create_response = client.post(
            "/api/v1/batches",
            json={"store_id": "shopee-default-store", "trigger_type": "manual"},
        )
        batch_id = create_response.json()["data"]["id"]
        client.post(f"/api/v1/batches/{batch_id}/start")

        # Pause the batch
        response = client.post(f"/api/v1/batches/{batch_id}/pause")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "paused"

    def test_resume_batch(self):
        """Test resuming a batch."""
        # Create, start, and pause a batch
        create_response = client.post(
            "/api/v1/batches",
            json={"store_id": "shopee-default-store", "trigger_type": "manual"},
        )
        batch_id = create_response.json()["data"]["id"]
        client.post(f"/api/v1/batches/{batch_id}/start")
        client.post(f"/api/v1/batches/{batch_id}/pause")

        # Resume the batch
        response = client.post(f"/api/v1/batches/{batch_id}/resume")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "running"

    def test_complete_batch(self):
        """Test completing a batch."""
        # Create a batch
        create_response = client.post(
            "/api/v1/batches",
            json={"store_id": "shopee-default-store", "trigger_type": "manual"},
        )
        batch_id = create_response.json()["data"]["id"]

        # Complete the batch
        response = client.post(f"/api/v1/batches/{batch_id}/complete")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "completed"

    def test_archive_batch(self):
        """Test archiving a batch."""
        # Create and complete a batch
        create_response = client.post(
            "/api/v1/batches",
            json={"store_id": "shopee-default-store", "trigger_type": "manual"},
        )
        batch_id = create_response.json()["data"]["id"]
        client.post(f"/api/v1/batches/{batch_id}/complete")

        # Archive the batch
        response = client.post(f"/api/v1/batches/{batch_id}/archive")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "archived"

    def test_get_batch_status(self):
        """Test getting batch with status counts."""
        # Create a batch
        create_response = client.post(
            "/api/v1/batches",
            json={"store_id": "shopee-default-store", "trigger_type": "manual"},
        )
        batch_id = create_response.json()["data"]["id"]

        # Get status
        response = client.get(f"/api/v1/batches/{batch_id}/status")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "status_counts" in data["data"]
