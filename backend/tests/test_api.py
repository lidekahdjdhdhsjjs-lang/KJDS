from urllib.parse import parse_qs, urlparse

from fastapi.testclient import TestClient
import pytest

from app.core.config import settings
from app.db import init_db, reset_db_connection_state
from app.main import app
from app.repositories.platform_connections import reset_platform_connections
from app.services.workflow import reset_workflow_state

client = TestClient(app)

OPERATOR_HEADERS = {"x-operator-id": "op-001", "x-operator-role": "operator"}
REVIEWER_HEADERS = {"x-operator-id": "rev-001", "x-operator-role": "reviewer"}
ADMIN_HEADERS = {"x-operator-id": "admin-001", "x-operator-role": "admin"}


@pytest.fixture(autouse=True)
def _reset_state() -> None:
    previous_env = settings.app_env
    previous_shopee = settings.shopee_authorized
    previous_alibaba = settings.alibaba_authorized
    settings.app_env = "test"
    settings.shopee_authorized = True
    settings.alibaba_authorized = True
    reset_db_connection_state()
    init_db()
    reset_workflow_state()
    reset_platform_connections()
    try:
        yield
    finally:
        settings.app_env = previous_env
        settings.shopee_authorized = previous_shopee
        settings.alibaba_authorized = previous_alibaba
        reset_db_connection_state()


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "data": {"status": "ok"},
        "error": None,
        "meta": None,
    }


def test_dashboard_summary_requires_identity_headers() -> None:
    response = client.get("/api/v1/dashboard/summary")
    assert response.status_code == 401
    assert response.json() == {"detail": "Missing operator identity headers"}


def test_dashboard_summary_returns_data_for_operator() -> None:
    response = client.get("/api/v1/dashboard/summary", headers=OPERATOR_HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["pending_candidates"] >= 0
    assert body["data"]["ready_for_review"] >= 0


def test_dashboard_authorization_returns_connected_state() -> None:
    response = client.get("/api/v1/dashboard/authorization", headers=OPERATOR_HEADERS)

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "data": {
            "shopee_connected": True,
            "alibaba_connected": True,
            "can_load_live_data": True,
            "missing_connections": [],
            "guidance": "Shopee and 1688 are connected. Live actions are available.",
        },
        "error": None,
        "meta": None,
    }


def test_dashboard_authorization_reports_missing_platforms() -> None:
    settings.shopee_authorized = False
    settings.alibaba_authorized = False
    reset_platform_connections()

    response = client.get("/api/v1/dashboard/authorization", headers=OPERATOR_HEADERS)

    assert response.status_code == 200
    assert response.json()["data"] == {
        "shopee_connected": False,
        "alibaba_connected": False,
        "can_load_live_data": False,
        "missing_connections": ["Shopee", "1688"],
        "guidance": "Connect Shopee and 1688 through their real authorization flows before running live actions.",
    }


def test_dashboard_authorization_reports_single_missing_platform() -> None:
    settings.alibaba_authorized = False
    reset_platform_connections()

    response = client.get("/api/v1/dashboard/authorization", headers=OPERATOR_HEADERS)

    assert response.status_code == 200
    assert response.json()["data"] == {
        "shopee_connected": True,
        "alibaba_connected": False,
        "can_load_live_data": False,
        "missing_connections": ["1688"],
        "guidance": "Connect 1688 through its real authorization flow before running live actions.",
    }


def test_header_auth_is_disabled_outside_development() -> None:
    settings.app_env = "production"

    response = client.get("/api/v1/dashboard/summary", headers=OPERATOR_HEADERS)

    assert response.status_code == 503
    assert response.json() == {"detail": "Header-based auth is disabled outside development"}


def test_drafts_require_identity_headers() -> None:
    response = client.get("/api/v1/drafts")
    assert response.status_code == 401
    assert response.json() == {"detail": "Missing operator identity headers"}


def test_drafts_return_items_for_operator() -> None:
    response = client.get("/api/v1/drafts", headers=OPERATOR_HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert len(body["data"]["items"]) == 1


def test_candidate_intake_adds_items() -> None:
    intake_response = client.post(
        "/api/v1/candidates/intake",
        json={"source": "manual", "count": 2},
        headers=OPERATOR_HEADERS,
    )
    assert intake_response.status_code == 200
    candidates_response = client.get("/api/v1/candidates")
    body = candidates_response.json()
    assert len(body["data"]["items"]) == 4


def test_generate_drafts_requires_identity_headers() -> None:
    response = client.post("/api/v1/drafts/generate")
    assert response.status_code == 401
    assert response.json() == {"detail": "Missing operator identity headers"}


def test_generate_drafts_rejects_blank_operator_id() -> None:
    response = client.post(
        "/api/v1/drafts/generate",
        headers={"x-operator-id": "   ", "x-operator-role": "operator"},
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Missing operator identity headers"}


def test_generate_drafts_rejects_unknown_role_header() -> None:
    response = client.post(
        "/api/v1/drafts/generate",
        headers={"x-operator-id": "op-001", "x-operator-role": "owner"},
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid operator role header"}


def test_generate_drafts_returns_new_drafts_for_operator() -> None:
    response = client.post("/api/v1/drafts/generate", headers=OPERATOR_HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["generated"] == 1
    assert body["data"]["items"][0]["candidate_id"] == "cand-002"


def test_review_approve_blocks_operator_role() -> None:
    response = client.post("/api/v1/review/draft-001/approve", headers=OPERATOR_HEADERS)
    assert response.status_code == 403
    assert response.json() == {"detail": "Operator role is not allowed for this action"}


def test_review_approve_updates_draft_state() -> None:
    approve_response = client.post("/api/v1/review/draft-001/approve", headers=REVIEWER_HEADERS)
    assert approve_response.status_code == 200

    drafts_response = client.get("/api/v1/drafts", headers=REVIEWER_HEADERS)
    draft = drafts_response.json()["data"]["items"][0]
    assert draft["status"] == "approved"
    assert draft["review_comment"] == "Approved by reviewer"


def test_review_reject_updates_draft_state() -> None:
    reject_response = client.post("/api/v1/review/draft-001/reject", headers=REVIEWER_HEADERS)
    assert reject_response.status_code == 200

    drafts_response = client.get("/api/v1/drafts", headers=REVIEWER_HEADERS)
    draft = drafts_response.json()["data"]["items"][0]
    assert draft["status"] == "changes_requested"
    assert draft["review_comment"] == "Needs revision before publish"


def test_publish_requires_admin_role() -> None:
    response = client.post("/api/v1/publish/draft-001", headers=REVIEWER_HEADERS)
    assert response.status_code == 403
    assert response.json() == {"detail": "Operator role is not allowed for this action"}


def test_publish_requires_approved_status() -> None:
    response = client.post("/api/v1/publish/draft-001", headers=ADMIN_HEADERS)
    assert response.status_code == 409
    assert response.json() == {"detail": "Only approved drafts can be published"}


def test_publish_allows_admin_after_approval() -> None:
    approve_response = client.post("/api/v1/review/draft-001/approve", headers=REVIEWER_HEADERS)
    assert approve_response.status_code == 200

    publish_response = client.post("/api/v1/publish/draft-001", headers=ADMIN_HEADERS)
    assert publish_response.status_code == 200
    assert publish_response.json()["data"] == {
        "draft_id": "draft-001",
        "status": "published",
    }

    drafts_response = client.get("/api/v1/drafts", headers=ADMIN_HEADERS)
    draft = drafts_response.json()["data"]["items"][0]
    assert draft["status"] == "published"
    assert draft["published_at"] is not None



def test_platform_connections_returns_both_platform_states() -> None:
    response = client.get("/api/v1/platform-connections", headers=OPERATOR_HEADERS)

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["meta"] == {"count": 2}
    assert body["data"]["authorization"] == {
        "shopee_connected": True,
        "alibaba_connected": True,
        "can_load_live_data": True,
        "missing_connections": [],
        "guidance": "Shopee and 1688 are connected. Live actions are available.",
    }
    items = body["data"]["items"]
    shopee_item = next(item for item in items if item["platform"] == "shopee")
    alibaba_item = next(item for item in items if item["platform"] == "1688")
    assert shopee_item["connected"] is True
    assert shopee_item["status"] == "connected"
    assert shopee_item["account_label"] == "Shopee store"
    assert shopee_item["last_connected_at"] is not None
    assert shopee_item["last_error"] is None
    assert alibaba_item["connected"] is True
    assert alibaba_item["status"] == "connected"
    assert alibaba_item["account_label"] == "1688 supplier account"
    assert alibaba_item["last_connected_at"] is not None
    assert alibaba_item["last_error"] is None


def test_platform_connection_start_returns_authorize_url_and_pending_state() -> None:
    response = client.post("/api/v1/platform-connections/shopee/start", headers=OPERATOR_HEADERS)

    assert response.status_code == 200
    body = response.json()
    assert body == {
        "success": True,
        "data": {
            "platform": "shopee",
            "status": "pending",
            "authorize_url": body["data"]["authorize_url"],
        },
        "error": None,
        "meta": None,
    }

    parsed = urlparse(body["data"]["authorize_url"])
    query = parse_qs(parsed.query)
    assert parsed.scheme == "https"
    assert parsed.netloc == "example.com"
    assert parsed.path == "/shopee/authorize"
    assert query["client_id"] == [settings.shopee_client_id]
    assert query["redirect_uri"] == [settings.shopee_redirect_uri]
    assert len(query["state"][0]) > 10

    list_response = client.get("/api/v1/platform-connections", headers=OPERATOR_HEADERS)
    shopee_connection = list_response.json()["data"]["items"][0]
    assert shopee_connection["status"] == "pending"
    assert shopee_connection["connected"] is False
    assert shopee_connection["authorize_url"] == body["data"]["authorize_url"]


def test_platform_connection_callback_rejects_invalid_state() -> None:
    client.post("/api/v1/platform-connections/shopee/start", headers=OPERATOR_HEADERS)

    response = client.get(
        "/api/v1/platform-connections/shopee/callback",
        params={"state": "wrong-state", "code": "demo-code", "response_mode": "json"},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Invalid or expired authorization state"}


def test_platform_connection_callback_redirects_invalid_state_for_browser_flow() -> None:
    client.post("/api/v1/platform-connections/shopee/start", headers=OPERATOR_HEADERS)

    response = client.get(
        "/api/v1/platform-connections/shopee/callback",
        params={"state": "wrong-state", "code": "demo-code"},
        follow_redirects=False,
    )

    assert response.status_code == 307
    assert response.headers["location"] == (
        "http://localhost:3000/dashboard?authorization_platform=shopee&authorization_status=error"
    )


def test_platform_connection_callback_marks_platform_connected() -> None:
    start_response = client.post("/api/v1/platform-connections/shopee/start", headers=OPERATOR_HEADERS)
    authorize_url = start_response.json()["data"]["authorize_url"]
    state = parse_qs(urlparse(authorize_url).query)["state"][0]

    response = client.get(
        "/api/v1/platform-connections/shopee/callback",
        params={"state": state, "code": "demo-code", "response_mode": "json"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["platform"] == "shopee"
    assert data["connected"] is True
    assert data["status"] == "connected"
    assert "Shopee" in data["account_label"]
    assert data["last_connected_at"] is not None
    assert data["last_error"] is None
    assert data["authorize_url"] is None


def test_platform_connection_callback_redirects_browser_to_dashboard_on_success() -> None:
    start_response = client.post("/api/v1/platform-connections/shopee/start", headers=OPERATOR_HEADERS)
    authorize_url = start_response.json()["data"]["authorize_url"]
    state = parse_qs(urlparse(authorize_url).query)["state"][0]

    response = client.get(
        "/api/v1/platform-connections/shopee/callback",
        params={"state": state, "code": "demo-code"},
        follow_redirects=False,
    )

    assert response.status_code == 307
    assert response.headers["location"] == (
        "http://localhost:3000/dashboard?authorization_platform=shopee&authorization_status=connected"
    )


def test_platform_connection_callback_marks_platform_error_from_provider_error() -> None:
    start_response = client.post("/api/v1/platform-connections/1688/start", headers=OPERATOR_HEADERS)
    authorize_url = start_response.json()["data"]["authorize_url"]
    state = parse_qs(urlparse(authorize_url).query)["state"][0]

    response = client.get(
        "/api/v1/platform-connections/1688/callback",
        params={"state": state, "error": "access_denied", "response_mode": "json"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["platform"] == "1688"
    assert data["connected"] is False
    assert data["status"] == "error"
    assert data["account_label"] is None
    assert data["last_connected_at"] is None
    assert data["last_error"] == "access_denied"
    assert data["authorize_url"] is None


def test_platform_connection_callback_redirects_browser_to_dashboard_on_error() -> None:
    start_response = client.post("/api/v1/platform-connections/1688/start", headers=OPERATOR_HEADERS)
    authorize_url = start_response.json()["data"]["authorize_url"]
    state = parse_qs(urlparse(authorize_url).query)["state"][0]

    response = client.get(
        "/api/v1/platform-connections/1688/callback",
        params={"state": state, "error": "access_denied"},
        follow_redirects=False,
    )

    assert response.status_code == 307
    assert response.headers["location"] == (
        "http://localhost:3000/dashboard?authorization_platform=1688&authorization_status=error"
    )


def test_platform_connection_disconnect_clears_connection_state() -> None:
    start_response = client.post("/api/v1/platform-connections/shopee/start", headers=OPERATOR_HEADERS)
    authorize_url = start_response.json()["data"]["authorize_url"]
    state = parse_qs(urlparse(authorize_url).query)["state"][0]
    client.get(
        "/api/v1/platform-connections/shopee/callback",
        params={"state": state, "code": "demo-code"},
    )

    response = client.post("/api/v1/platform-connections/shopee/disconnect", headers=OPERATOR_HEADERS)

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["platform"] == "shopee"
    assert data["connected"] is False
    assert data["status"] == "disconnected"
    assert data["account_label"] is None
    assert data["last_connected_at"] is None
    assert data["last_error"] is None
    assert data["authorize_url"] is None

    authorization = client.get("/api/v1/dashboard/authorization", headers=OPERATOR_HEADERS).json()["data"]
    assert authorization["shopee_connected"] is False
    assert authorization["alibaba_connected"] is True
    assert authorization["can_load_live_data"] is False
    assert "Shopee" in authorization["guidance"]



def test_operator_journey_generates_without_duplicates_and_reaches_publish() -> None:
    intake_response = client.post(
        "/api/v1/candidates/intake",
        json={"source": "manual", "count": 2},
        headers=OPERATOR_HEADERS,
    )
    assert intake_response.status_code == 200

    first_generate = client.post("/api/v1/drafts/generate", headers=OPERATOR_HEADERS)
    assert first_generate.status_code == 200
    first_generate_body = first_generate.json()["data"]
    assert first_generate_body["generated"] == 3

    second_generate = client.post("/api/v1/drafts/generate", headers=OPERATOR_HEADERS)
    assert second_generate.status_code == 200
    second_generate_body = second_generate.json()["data"]
    assert second_generate_body == {"generated": 0, "items": []}

    approve_response = client.post("/api/v1/review/draft-002/approve", headers=REVIEWER_HEADERS)
    assert approve_response.status_code == 200

    publish_response = client.post("/api/v1/publish/draft-002", headers=ADMIN_HEADERS)
    assert publish_response.status_code == 200

    drafts = client.get("/api/v1/drafts", headers=ADMIN_HEADERS).json()["data"]["items"]
    assert len(drafts) == 4
    published_draft = next(draft for draft in drafts if draft["id"] == "draft-002")
    assert published_draft["status"] == "published"
    assert published_draft["published_at"] is not None

    summary = client.get("/api/v1/dashboard/summary", headers=ADMIN_HEADERS).json()["data"]
    assert summary == {
        "pending_candidates": 1,
        "ready_for_review": 3,
        "approved_today": 1,
        "published_today": 1,
        "failed_jobs": 0,
    }


def test_stores_list_returns_default_stores() -> None:
    response = client.get("/api/v1/platform-connections/stores", headers=OPERATOR_HEADERS)

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["meta"]["count"] == 2
    items = body["data"]["items"]
    assert len(items) == 2

    shopee_store = next(s for s in items if s["platform"] == "shopee")
    assert shopee_store["status"] == "active"
    assert "Shopee" in shopee_store["name"]

    alibaba_store = next(s for s in items if s["platform"] == "1688")
    assert alibaba_store["status"] == "active"
    assert "1688" in alibaba_store["name"]


def test_store_authorizations_list_returns_authorization_status() -> None:
    stores_response = client.get("/api/v1/platform-connections/stores", headers=OPERATOR_HEADERS)
    store_id = stores_response.json()["data"]["items"][0]["id"]

    response = client.get(f"/api/v1/platform-connections/stores/{store_id}/authorizations", headers=OPERATOR_HEADERS)

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    items = body["data"]["items"]
    assert len(items) >= 1
    auth = items[0]
    assert auth["platform"] in ("shopee", "1688")
    assert "connected" in auth
    assert "status" in auth


def test_store_health_returns_health_status() -> None:
    stores_response = client.get("/api/v1/platform-connections/stores", headers=OPERATOR_HEADERS)
    store_id = stores_response.json()["data"]["items"][0]["id"]

    response = client.get(f"/api/v1/platform-connections/stores/{store_id}/health", headers=OPERATOR_HEADERS)

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    health = body["data"]["item"]
    assert health["store_id"] == store_id
    assert health["auth_status"] in ("connected", "disconnected", "pending", "error")
    assert health["overall_status"] in ("healthy", "warning", "critical")


def test_store_health_returns_404_for_invalid_store() -> None:
    response = client.get("/api/v1/platform-connections/stores/invalid-store-id/health", headers=OPERATOR_HEADERS)

    assert response.status_code == 400
