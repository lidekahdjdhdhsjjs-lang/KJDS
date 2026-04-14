"""Tests for Sprint 2 opportunity item management."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestOpportunityItemEndpoints:
    """Tests for opportunity item API endpoints."""

    def test_create_item(self):
        """Test creating a new opportunity item."""
        # Create a batch first
        batch_response = client.post(
            "/api/v1/batches",
            json={"store_id": "shopee-default-store", "trigger_type": "manual"},
        )
        batch_id = batch_response.json()["data"]["id"]

        response = client.post(
            "/api/v1/opportunities",
            json={
                "batch_id": batch_id,
                "store_id": "shopee-default-store",
                "risk_level": 0,
                "score_total": 85.5,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["batch_id"] == batch_id
        assert data["data"]["status"] == "discovered"

    def test_list_items(self):
        """Test listing items."""
        # Create batch and item
        batch_response = client.post(
            "/api/v1/batches",
            json={"store_id": "shopee-default-store", "trigger_type": "manual"},
        )
        batch_id = batch_response.json()["data"]["id"]
        client.post(
            "/api/v1/opportunities",
            json={"batch_id": batch_id, "store_id": "shopee-default-store"},
        )

        response = client.get("/api/v1/opportunities")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"]["items"], list)

    def test_get_item(self):
        """Test getting a specific item."""
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

        response = client.get(f"/api/v1/opportunities/{item_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["id"] == item_id

    def test_get_item_detail(self):
        """Test getting item with all related entities."""
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

        response = client.get(f"/api/v1/opportunities/{item_id}/detail")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "item" in data["data"]
        assert "supply_candidates" in data["data"]

    def test_add_supply_candidate(self):
        """Test adding a supply candidate."""
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

        response = client.post(
            f"/api/v1/opportunities/{item_id}/supply-candidates",
            json={
                "opportunity_item_id": item_id,
                "source_platform": "1688",
                "source_item_ref": "item-12345",
                "cost_amount": 50.0,
                "moq": 10,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["source_platform"] == "1688"

    def test_create_mapping(self):
        """Test creating a category mapping."""
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

        response = client.post(
            f"/api/v1/opportunities/{item_id}/mapping",
            json={
                "opportunity_item_id": item_id,
                "category_ref": "cat-123",
                "attributes_payload": '{"color": "blue", "size": "M"}',
                "confidence_score": 0.85,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["category_ref"] == "cat-123"

    def test_create_content_variant(self):
        """Test creating a content variant."""
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

        response = client.post(
            f"/api/v1/opportunities/{item_id}/content",
            json={
                "opportunity_item_id": item_id,
                "title": "Test Product Title",
                "bullet_points": '["Point 1", "Point 2"]',
                "locale": "vi",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["title"] == "Test Product Title"

    def test_create_pricing_decision(self):
        """Test creating a pricing decision."""
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

        response = client.post(
            f"/api/v1/opportunities/{item_id}/pricing",
            json={
                "opportunity_item_id": item_id,
                "cost_payload": '{"product": 50, "shipping": 5}',
                "fee_payload": '{"platform": 0.05, "payment": 0.02}',
                "exchange_rate_payload": '{"rate": 24000}',
                "suggested_price": 150000,
                "min_profit_line": 120000,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["suggested_price"] == 150000

    def test_run_preflight(self):
        """Test running a preflight check."""
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

        response = client.post(
            f"/api/v1/opportunities/{item_id}/preflight",
            json={
                "opportunity_item_id": item_id,
                "profit_check": "passed",
                "compliance_check": "passed",
                "supply_check": "passed",
                "account_health_check": "passed",
                "detail_payload": '{"notes": "All checks passed"}',
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["overall_result"] == "passed"

    def test_advance_to_shortlisted(self):
        """Test advancing item status."""
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

        response = client.post(f"/api/v1/opportunities/{item_id}/advance/shortlisted")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "shortlisted"
