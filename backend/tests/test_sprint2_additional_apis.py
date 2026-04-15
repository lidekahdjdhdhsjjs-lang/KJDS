"""Tests for Sprint 2 additional API endpoints: feedback, demand signals, training packages."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
OPERATOR_HEADERS = {'x-operator-id': 'test-op', 'x-operator-role': 'operator'}

@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)

class TestFeedbackRecordEndpoints:
    """Tests for feedback record API endpoints."""

    def test_create_feedback(self, client):
        """Test creating a feedback record."""
        batch_resp = client.post('/api/v1/batches', json={'store_id': 'test-store', 'trigger_type': 'manual'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        batch_id = batch_resp.json()['data']['id']
        item_resp = client.post('/api/v1/opportunities', json={'batch_id': batch_id, 'store_id': 'test-store'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        item_id = item_resp.json()['data']['id']
        response = client.post('/api/v1/feedback-records', json={'opportunity_item_id': item_id, 'feedback_type': 'content_fix', 'source_type': 'operator', 'before_payload': '{"title": "old title"}', 'after_payload': '{"title": "new title"}'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['data']['feedback_type'] == 'content_fix'
        assert data['data']['review_status'] == 'pending'

    def test_list_feedback(self, client):
        """Test listing feedback records."""
        response = client.get('/api/v1/feedback-records', headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert 'items' in data['data']
        assert 'total' in data['data']
        assert isinstance(data['data']['items'], list)

    def test_list_feedback_with_filters(self, client):
        """Test listing feedback with filters."""
        response = client.get('/api/v1/feedback-records', params={'feedback_type': 'content_fix', 'review_status': 'pending'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert 'items' in data['data']

    def test_approve_feedback(self, client):
        """Test approving a feedback record."""
        batch_resp = client.post('/api/v1/batches', json={'store_id': 'test-store', 'trigger_type': 'manual'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        batch_id = batch_resp.json()['data']['id']
        item_resp = client.post('/api/v1/opportunities', json={'batch_id': batch_id, 'store_id': 'test-store'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        item_id = item_resp.json()['data']['id']
        fb_resp = client.post('/api/v1/feedback-records', json={'opportunity_item_id': item_id, 'feedback_type': 'mapping_fix', 'source_type': 'reviewer', 'before_payload': '{"category": "old"}', 'after_payload': '{"category": "new"}'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        feedback_id = fb_resp.json()['data']['id']
        response = client.post(f'/api/v1/feedback-records/{feedback_id}/approve', headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['data']['review_status'] == 'approved'

    def test_reject_feedback(self, client):
        """Test rejecting a feedback record."""
        batch_resp = client.post('/api/v1/batches', json={'store_id': 'test-store', 'trigger_type': 'manual'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        batch_id = batch_resp.json()['data']['id']
        item_resp = client.post('/api/v1/opportunities', json={'batch_id': batch_id, 'store_id': 'test-store'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        item_id = item_resp.json()['data']['id']
        fb_resp = client.post('/api/v1/feedback-records', json={'opportunity_item_id': item_id, 'feedback_type': 'pricing_fix', 'source_type': 'admin', 'before_payload': '{"price": 100}', 'after_payload': '{"price": 120}'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        feedback_id = fb_resp.json()['data']['id']
        response = client.post(f'/api/v1/feedback-records/{feedback_id}/reject', headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['data']['review_status'] == 'rejected'

    def test_approve_nonexistent_feedback(self, client):
        """Test approving a non-existent feedback record."""
        response = client.post('/api/v1/feedback-records/nonexistent-id/approve', headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert response.status_code == 404

class TestDemandSignalEndpoints:
    """Tests for demand signal snapshot API endpoints."""

    def test_create_demand_signal(self, client):
        """Test creating a demand signal snapshot."""
        batch_resp = client.post('/api/v1/batches', json={'store_id': 'test-store', 'trigger_type': 'manual'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        batch_id = batch_resp.json()['data']['id']
        item_resp = client.post('/api/v1/opportunities', json={'batch_id': batch_id, 'store_id': 'test-store'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        item_id = item_resp.json()['data']['id']
        response = client.post('/api/v1/demand-signals', json={'opportunity_item_id': item_id, 'signal_type': 'hot_keyword', 'source': 'shopee_trending', 'payload': '{"keyword": "phone case", "volume": 10000}', 'snapshot_time': '2024-01-01T00:00:00Z'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['data']['signal_type'] == 'hot_keyword'

    def test_list_demand_signals_for_item(self, client):
        """Test listing demand signals for an item."""
        batch_resp = client.post('/api/v1/batches', json={'store_id': 'test-store', 'trigger_type': 'manual'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        batch_id = batch_resp.json()['data']['id']
        item_resp = client.post('/api/v1/opportunities', json={'batch_id': batch_id, 'store_id': 'test-store'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        item_id = item_resp.json()['data']['id']
        client.post('/api/v1/demand-signals', json={'opportunity_item_id': item_id, 'signal_type': 'competitor', 'source': 'shopee_search', 'payload': '{"competitor_id": "12345"}', 'snapshot_time': '2024-01-01T00:00:00Z'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        response = client.get(f'/api/v1/demand-signals/item/{item_id}', headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert isinstance(data['data'], list)

    def test_get_demand_signal(self, client):
        """Test getting a specific demand signal."""
        batch_resp = client.post('/api/v1/batches', json={'store_id': 'test-store', 'trigger_type': 'manual'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        batch_id = batch_resp.json()['data']['id']
        item_resp = client.post('/api/v1/opportunities', json={'batch_id': batch_id, 'store_id': 'test-store'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        item_id = item_resp.json()['data']['id']
        signal_resp = client.post('/api/v1/demand-signals', json={'opportunity_item_id': item_id, 'signal_type': 'review_pain', 'source': 'shopee_reviews', 'payload': '{"pain_point": "quality issues"}', 'snapshot_time': '2024-01-01T00:00:00Z'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        signal_id = signal_resp.json()['data']['id']
        response = client.get(f'/api/v1/demand-signals/{signal_id}', headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['data']['id'] == signal_id

class TestTrainingPackageEndpoints:
    """Tests for training archive package API endpoints."""

    def test_create_training_package(self, client):
        """Test creating a training package."""
        response = client.post('/api/v1/training-packages', json={'package_type': 'manual', 'storage_uri': 's3://bucket/package.tar.gz', 'manifest_payload': '{"items": 100, "date": "2024-01-01"}'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['data']['package_type'] == 'manual'

    def test_create_training_package_with_batch(self, client):
        """Test creating a training package linked to a batch."""
        batch_resp = client.post('/api/v1/batches', json={'store_id': 'test-store', 'trigger_type': 'manual'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        batch_id = batch_resp.json()['data']['id']
        response = client.post('/api/v1/training-packages', json={'batch_id': batch_id, 'package_type': 'batch', 'storage_uri': 's3://bucket/batch-package.tar.gz', 'manifest_payload': '{"batch_id": "' + batch_id + '"}'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['data']['batch_id'] == batch_id

    def test_list_training_packages(self, client):
        """Test listing training packages."""
        client.post('/api/v1/training-packages', json={'package_type': 'manual', 'storage_uri': 's3://bucket/test.tar.gz', 'manifest_payload': '{"test": true}'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        response = client.get('/api/v1/training-packages', headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert isinstance(data['data'], list)

    def test_list_training_packages_with_filters(self, client):
        """Test listing training packages with filters."""
        response = client.get('/api/v1/training-packages', params={'package_type': 'batch'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True

    def test_get_training_package(self, client):
        """Test getting a specific training package."""
        pkg_resp = client.post('/api/v1/training-packages', json={'package_type': 'manual', 'storage_uri': 's3://bucket/get-test.tar.gz', 'manifest_payload': '{"test": "get"}'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        pkg_id = pkg_resp.json()['data']['id']
        response = client.get(f'/api/v1/training-packages/{pkg_id}', headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['data']['id'] == pkg_id

    def test_get_nonexistent_training_package(self, client):
        """Test getting a non-existent training package."""
        response = client.get('/api/v1/training-packages/nonexistent-id', headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert response.status_code == 404