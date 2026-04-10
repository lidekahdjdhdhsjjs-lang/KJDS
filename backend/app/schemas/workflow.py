from pydantic import BaseModel


class CandidateItem(BaseModel):
    id: str
    supplier_name: str
    title_raw: str
    risk_level: int
    score: float
    status: str


class DraftItem(BaseModel):
    id: str
    candidate_id: str
    title: str
    status: str
    draft_version: int
    review_comment: str | None = None
    published_at: str | None = None
