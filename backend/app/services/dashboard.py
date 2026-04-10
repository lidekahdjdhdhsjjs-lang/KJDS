from app.schemas.dashboard import PlatformAuthorizationStatus
from app.services.platform_connections import get_platform_authorization_status
from app.services.workflow import get_dashboard_summary


def get_dashboard_summary_view() -> dict:
    return get_dashboard_summary()


def get_platform_authorization_status_view() -> PlatformAuthorizationStatus:
    return get_platform_authorization_status()
