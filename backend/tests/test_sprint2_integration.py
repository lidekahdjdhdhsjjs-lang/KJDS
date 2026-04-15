"""Integration tests for Sprint 2 complete workflows."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
OPERATOR_HEADERS = {'x-operator-id': 'test-op', 'x-operator-role': 'operator'}
REVIEWER_HEADERS = {'x-operator-id': 'test-reviewer', 'x-operator-role': 'reviewer'}
client = TestClient(app)

class TestBatchWorkflow:
    """Tests for complete batch workflow from creation to completion."""

    def test_full_batch_lifecycle(self):
        """Test complete batch lifecycle: create -> start -> pause -> resume -> complete."""
        create_response = client.post('/api/v1/batches', json={'store_id': 'shopee-default-store', 'trigger_type': 'manual'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert create_response.status_code == 200
        batch_id = create_response.json()['data']['id']
        start_response = client.post(f'/api/v1/batches/{batch_id}/start', headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert start_response.status_code == 200
        assert start_response.json()['data']['status'] == 'running'
        pause_response = client.post(f'/api/v1/batches/{batch_id}/pause', headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert pause_response.status_code == 200
        assert pause_response.json()['data']['status'] == 'paused'
        resume_response = client.post(f'/api/v1/batches/{batch_id}/resume', headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert resume_response.status_code == 200
        assert resume_response.json()['data']['status'] == 'running'
        complete_response = client.post(f'/api/v1/batches/{batch_id}/complete', headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert complete_response.status_code == 200
        assert complete_response.json()['data']['status'] == 'completed'

    def test_batch_with_multiple_items(self):
        """Test batch containing multiple items with different statuses."""
        batch_response = client.post('/api/v1/batches', json={'store_id': 'shopee-default-store', 'trigger_type': 'manual'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        batch_id = batch_response.json()['data']['id']
        item_ids = []
        for i in range(3):
            item_response = client.post('/api/v1/opportunities', json={'batch_id': batch_id, 'store_id': 'shopee-default-store', 'score_total': 70 + i * 10}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
            item_ids.append(item_response.json()['data']['id'])
        list_response = client.get(f'/api/v1/opportunities?batch_id={batch_id}', headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert list_response.status_code == 200
        items = list_response.json()['data']['items']
        assert len(items) == 3

class TestOpportunityItemWorkflow:
    """Tests for complete opportunity item workflow."""

    def test_item_status_transitions(self):
        """Test item status transitions from discovered to shortlisted."""
        batch_response = client.post('/api/v1/batches', json={'store_id': 'shopee-default-store', 'trigger_type': 'manual'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        batch_id = batch_response.json()['data']['id']
        item_response = client.post('/api/v1/opportunities', json={'batch_id': batch_id, 'store_id': 'shopee-default-store'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        item_id = item_response.json()['data']['id']
        assert item_response.json()['data']['status'] == 'discovered'
        advance_response = client.post(f'/api/v1/opportunities/{item_id}/advance/shortlisted', headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert advance_response.status_code == 200
        assert advance_response.json()['data']['status'] == 'shortlisted'
        get_response = client.get(f'/api/v1/opportunities/{item_id}', headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert get_response.status_code == 200
        assert get_response.json()['data']['status'] == 'shortlisted'

    def test_item_with_supply_candidate(self):
        """Test item with supply candidate creation and retrieval."""
        batch_response = client.post('/api/v1/batches', json={'store_id': 'shopee-default-store', 'trigger_type': 'manual'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        batch_id = batch_response.json()['data']['id']
        item_response = client.post('/api/v1/opportunities', json={'batch_id': batch_id, 'store_id': 'shopee-default-store'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        item_id = item_response.json()['data']['id']
        supply_response = client.post(f'/api/v1/opportunities/{item_id}/supply-candidates', json={'opportunity_item_id': item_id, 'source_platform': '1688', 'source_item_ref': 'item-test-123', 'cost_amount': 45.0, 'moq': 10}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert supply_response.status_code == 200
        detail_response = client.get(f'/api/v1/opportunities/{item_id}/detail', headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert detail_response.status_code == 200
        detail = detail_response.json()['data']
        assert len(detail['supply_candidates']) == 1
        assert detail['supply_candidates'][0]['source_platform'] == '1688'

    def test_item_with_category_mapping(self):
        """Test item with category mapping creation."""
        batch_response = client.post('/api/v1/batches', json={'store_id': 'shopee-default-store', 'trigger_type': 'manual'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        batch_id = batch_response.json()['data']['id']
        item_response = client.post('/api/v1/opportunities', json={'batch_id': batch_id, 'store_id': 'shopee-default-store'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        item_id = item_response.json()['data']['id']
        mapping_response = client.post(f'/api/v1/opportunities/{item_id}/mapping', json={'opportunity_item_id': item_id, 'category_ref': 'cat-123', 'attributes_payload': '{"color": "blue"}', 'confidence_score': 0.85}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert mapping_response.status_code == 200
        detail_response = client.get(f'/api/v1/opportunities/{item_id}/detail', headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert detail_response.status_code == 200
        detail = detail_response.json()['data']
        assert len(detail['mappings']) == 1

class TestPublishWorkflow:
    """Tests for complete publish workflow."""

    def test_publish_task_complete_cycle(self):
        """Test publish task from creation to completion."""
        batch_response = client.post('/api/v1/batches', json={'store_id': 'shopee-default-store', 'trigger_type': 'manual'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        batch_id = batch_response.json()['data']['id']
        item_response = client.post('/api/v1/opportunities', json={'batch_id': batch_id, 'store_id': 'shopee-default-store'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        item_id = item_response.json()['data']['id']
        task_response = client.post('/api/v1/publish-tasks', json={'opportunity_item_id': item_id, 'store_id': 'shopee-default-store', 'channel': 'api'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        task_id = task_response.json()['data']['id']
        start_response = client.post(f'/api/v1/publish-tasks/{task_id}/start', headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert start_response.status_code == 200
        assert start_response.json()['data']['status'] == 'running'
        complete_response = client.post(f'/api/v1/publish-tasks/{task_id}/complete', json={'platform_item_ref': 'shopee-item-xyz'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert complete_response.status_code == 200
        assert complete_response.json()['data']['status'] == 'succeeded'

    def test_publish_task_failure_and_retry(self):
        """Test publish task failure and retry handling."""
        batch_response = client.post('/api/v1/batches', json={'store_id': 'shopee-default-store', 'trigger_type': 'manual'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        batch_id = batch_response.json()['data']['id']
        item_response = client.post('/api/v1/opportunities', json={'batch_id': batch_id, 'store_id': 'shopee-default-store'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        item_id = item_response.json()['data']['id']
        task_response = client.post('/api/v1/publish-tasks', json={'opportunity_item_id': item_id, 'store_id': 'shopee-default-store'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        task_id = task_response.json()['data']['id']
        fail_response = client.post(f'/api/v1/publish-tasks/{task_id}/fail', params={'error': 'Rate limit exceeded', 'retryable': 'true'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert fail_response.status_code == 200
        assert fail_response.json()['data']['status'] == 'failed_retryable'

class TestProcurementWorkflow:
    """Tests for procurement draft workflow."""

    def test_procurement_draft_workflow(self):
        """Test procurement draft from creation to confirmation."""
        batch_response = client.post('/api/v1/batches', json={'store_id': 'shopee-default-store', 'trigger_type': 'manual'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        batch_id = batch_response.json()['data']['id']
        item_response = client.post('/api/v1/opportunities', json={'batch_id': batch_id, 'store_id': 'shopee-default-store'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        item_id = item_response.json()['data']['id']
        draft_response = client.post('/api/v1/procurement-drafts', json={'opportunity_item_id': item_id, 'supplier_ref': 'supplier-1688-001', 'purchase_price': 50.0, 'qty': 100}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert draft_response.status_code == 200
        draft_id = draft_response.json()['data']['id']
        submit_response = client.post(f'/api/v1/procurement-drafts/{draft_id}/submit', headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert submit_response.status_code == 200
        assert submit_response.json()['data']['status'] == 'awaiting_confirmation'
        confirm_response = client.post(f'/api/v1/procurement-drafts/{draft_id}/confirm', headers=REVIEWER_HEADERS)
        assert confirm_response.status_code == 200
        assert confirm_response.json()['data']['status'] == 'confirmed'

class TestAgentRunWorkflow:
    """Tests for agent run tracking."""

    def test_agent_run_complete_workflow(self):
        """Test agent run from creation to completion."""
        run_response = client.post('/api/v1/agent-runs', json={'agent_name': 'sourcing', 'entity_type': 'opportunity_item', 'entity_id': 'item-test-001', 'model_name': 'gpt-4', 'input_summary': 'Scoring supply candidates'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert run_response.status_code == 200
        run_id = run_response.json()['data']['id']
        complete_response = client.post(f'/api/v1/agent-runs/{run_id}/complete', json={'output_summary': 'Selected best candidate', 'evidence_payload': '{"score": 0.95}'}, headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert complete_response.status_code == 200
        assert complete_response.json()['data']['status'] == 'completed'
        entity_runs = client.get('/api/v1/agent-runs/entity/opportunity_item/item-test-001', headers={'x-operator-id': 'test-op', 'x-operator-role': 'operator'})
        assert entity_runs.status_code == 200
        assert len(entity_runs.json()['data']) >= 1