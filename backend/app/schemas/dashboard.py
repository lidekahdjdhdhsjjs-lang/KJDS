from pydantic import BaseModel


class DashboardSummary(BaseModel):
    pending_candidates: int
    ready_for_review: int
    approved_today: int
    published_today: int
    failed_jobs: int


class PlatformAuthorizationStatus(BaseModel):
    shopee_connected: bool
    alibaba_connected: bool
    can_load_live_data: bool
    missing_connections: list[str]
    guidance: str
