"""Tests for Sprint 2 batch management."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
OPERATOR_HEADERS = {'x-operator-id': 'test-op', 'x-operator-role': 'operator'}
client = TestClient(app)

class TestBatchEndpoints:
    """Tests for batch API endpoints."""

    def test_create_batch(self):
        """Test creating a new batch."""
        response = client.post('/api/v1/batches', json={'store_id': 'shopee-default-store', 'trigger_type': 'manual', 'trigger_payload': '{"source": "test"}', 'priority': 1}, headers=OPERATOR_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['data']['store_id'] == 'shopee-default-store'
        assert data['data']['trigger_type'] == 'manual'
        assert data['data']['status'] == 'draft'

    def test_list_batches(self):
        """Test listing batches."""
        client.post('/api/v1/batches', json={'store_id': 'shopee-default-store', 'trigger_type': 'manual'}, headers=OPERATOR_HEADERS)
        response = client.get('/api/v1/batches', headers=OPERATOR_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert isinstance(data['data']['items'], list)

    def test_get_batch(self):
        """Test getting a specific batch."""
        create_response = client.post('/api/v1/batches', json={'store_id': 'shopee-default-store', 'trigger_type': 'manual'}, headers=OPERATOR_HEADERS)
        batch_id = create_response.json()['data']['id']
        response = client.get(f'/api/v1/batches/{batch_id}', headers=OPERATOR_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['data']['id'] == batch_id

    def test_start_batch(self):
        """Test starting a batch."""
        create_response = client.post('/api/v1/batches', json={'store_id': 'shopee-default-store', 'trigger_type': 'manual'}, headers=OPERATOR_HEADERS)
        batch_id = create_response.json()['data']['id']
        response = client.post(f'/api/v1/batches/{batch_id}/start', headers=OPERATOR_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['data']['status'] == 'running'

    def test_pause_batch(self):
        """Test pausing a batch."""
        create_response = client.post('/api/v1/batches', json={'store_id': 'shopee-default-store', 'trigger_type': 'manual'}, headers=OPERATOR_HEADERS)
        batch_id = create_response.json()['data']['id']
        client.post(f'/api/v1/batches/{batch_id}/start', headers=OPERATOR_HEADERS)
        response = client.post(f'/api/v1/batches/{batch_id}/pause', headers=OPERATOR_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['data']['status'] == 'paused'

    def test_resume_batch(self):
        """Test resuming a batch."""
        create_response = client.post('/api/v1/batches', json={'store_id': 'shopee-default-store', 'trigger_type': 'manual'}, headers=OPERATOR_HEADERS)
        batch_id = create_response.json()['data']['id']
        client.post(f'/api/v1/batches/{batch_id}/start', headers=OPERATOR_HEADERS)
        client.post(f'/api/v1/batches/{batch_id}/pause', headers=OPERATOR_HEADERS)
        response = client.post(f'/api/v1/batches/{batch_id}/resume', headers=OPERATOR_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['data']['status'] == 'running'

    def test_complete_batch(self):
        """Test completing a batch."""
        create_response = client.post('/api/v1/batches', json={'store_id': 'shopee-default-store', 'trigger_type': 'manual'}, headers=OPERATOR_HEADERS)
        batch_id = create_response.json()['data']['id']
        response = client.post(f'/api/v1/batches/{batch_id}/complete', headers=OPERATOR_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['data']['status'] == 'completed'

    def test_archive_batch(self):
        """Test archiving a batch."""
        create_response = client.post('/api/v1/batches', json={'store_id': 'shopee-default-store', 'trigger_type': 'manual'}, headers=OPERATOR_HEADERS)
        batch_id = create_response.json()['data']['id']
        client.post(f'/api/v1/batches/{batch_id}/complete', headers=OPERATOR_HEADERS)
        response = client.post(f'/api/v1/batches/{batch_id}/archive', headers=OPERATOR_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['data']['status'] == 'archived'

    def test_get_batch_status(self):
        """Test getting batch with status counts."""
        create_response = client.post('/api/v1/batches', json={'store_id': 'shopee-default-store', 'trigger_type': 'manual'}, headers=OPERATOR_HEADERS)
        batch_id = create_response.json()['data']['id']
        response = client.get(f'/api/v1/batches/{batch_id}/status', headers=OPERATOR_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert 'status_counts' in data['data']