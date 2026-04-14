from datetime import UTC, datetime

from sqlalchemy import func, select

from app.db import SessionLocal
from app.models import CandidateRecord, DraftRecord
from app.schemas.dashboard import DashboardSummary
from app.schemas.workflow import CandidateItem, DraftItem

WORKFLOW_COUNTERS = {
    "approved_today": 0,
    "published_today": 0,
    "failed_jobs": 0,
}


def _candidate_from_record(record: CandidateRecord) -> dict:
    return CandidateItem(
        id=record.id,
        supplier_name=record.supplier_name,
        title_raw=record.title_raw,
        risk_level=record.risk_level,
        score=record.score,
        status=record.status,
    ).model_dump()



def _draft_from_record(record: DraftRecord) -> dict:
    return DraftItem(
        id=record.id,
        candidate_id=record.candidate_id,
        title=record.title,
        status=record.status,
        draft_version=record.draft_version,
        review_comment=record.review_comment,
        published_at=record.published_at.isoformat() if record.published_at else None,
    ).model_dump()



def reset_workflow_state() -> None:
    """Clear all workflow data from database."""
    with SessionLocal() as session:
        session.query(DraftRecord).delete()
        session.query(CandidateRecord).delete()
        session.commit()
    WORKFLOW_COUNTERS["approved_today"] = 0
    WORKFLOW_COUNTERS["published_today"] = 0
    WORKFLOW_COUNTERS["failed_jobs"] = 0



def _next_candidate_id() -> str:
    with SessionLocal() as session:
        count = session.scalar(select(func.count()).select_from(CandidateRecord)) or 0
        return f"cand-{count + 1:03d}"



def _next_draft_id() -> str:
    with SessionLocal() as session:
        count = session.scalar(select(func.count()).select_from(DraftRecord)) or 0
        return f"draft-{count + 1:03d}"



def list_candidates() -> list[dict]:
    with SessionLocal() as session:
        records = session.scalars(select(CandidateRecord).order_by(CandidateRecord.id)).all()
        return [_candidate_from_record(record) for record in records]



def queue_candidate_intake(source: str, count: int) -> dict[str, str | int]:
    with SessionLocal() as session:
        existing_count = session.scalar(select(func.count()).select_from(CandidateRecord)) or 0
        for index in range(count):
            candidate = CandidateItem(
                id=f"cand-{existing_count + index + 1:03d}",
                supplier_name=f"{source}-supplier-{index + 1}",
                title_raw=f"{source.title()} product candidate {index + 1}",
                risk_level=1,
                score=0.65,
                status="new",
            )
            session.add(CandidateRecord(**candidate.model_dump()))
        session.commit()

    return {
        "accepted": count,
        "source": source,
        "status": "queued",
    }



def list_drafts() -> list[dict]:
    with SessionLocal() as session:
        records = session.scalars(select(DraftRecord).order_by(DraftRecord.id)).all()
        return [_draft_from_record(record) for record in records]



def generate_drafts() -> dict[str, object]:
    generated: list[dict] = []

    with SessionLocal() as session:
        existing_candidate_ids = set(session.scalars(select(DraftRecord.candidate_id)).all())
        candidates = session.scalars(select(CandidateRecord).order_by(CandidateRecord.id)).all()
        next_index = (session.scalar(select(func.count()).select_from(DraftRecord)) or 0) + 1

        for candidate in candidates:
            if candidate.id in existing_candidate_ids:
                continue

            draft = DraftRecord(
                id=f"draft-{next_index:03d}",
                candidate_id=candidate.id,
                title=f"Optimized listing for {candidate.title_raw}",
                status="ready_for_review",
                draft_version=1,
            )
            next_index += 1
            session.add(draft)
            candidate.status = "drafted"
            session.flush()
            generated.append(_draft_from_record(draft))

        session.commit()

    return {"generated": len(generated), "items": generated}



def _find_draft_record(session, draft_id: str) -> DraftRecord:
    record = session.get(DraftRecord, draft_id)
    if record is None:
        raise LookupError(f"Draft {draft_id} not found")
    return record



def approve_draft(draft_id: str) -> dict[str, str]:
    with SessionLocal() as session:
        draft = _find_draft_record(session, draft_id)
        if draft.status not in {"ready_for_review", "changes_requested"}:
            raise ValueError("Only drafts awaiting review can be approved")

        draft.status = "approved"
        draft.review_comment = "Approved by reviewer"
        session.commit()

    WORKFLOW_COUNTERS["approved_today"] += 1
    return {
        "draft_id": draft_id,
        "decision": "approved",
        "next": "publish_queue",
    }



def reject_draft(draft_id: str) -> dict[str, str]:
    with SessionLocal() as session:
        draft = _find_draft_record(session, draft_id)
        if draft.status not in {"ready_for_review", "approved"}:
            raise ValueError("Only active drafts can be rejected")

        if draft.status == "approved":
            WORKFLOW_COUNTERS["approved_today"] = max(0, WORKFLOW_COUNTERS["approved_today"] - 1)

        draft.status = "changes_requested"
        draft.review_comment = "Needs revision before publish"
        session.commit()

    return {
        "draft_id": draft_id,
        "decision": "rejected",
        "next": "draft_revision",
    }



def publish_draft(draft_id: str) -> dict[str, str]:
    with SessionLocal() as session:
        draft = _find_draft_record(session, draft_id)
        if draft.status != "approved":
            raise ValueError("Only approved drafts can be published")

        draft.status = "published"
        draft.published_at = datetime.now(UTC)
        session.commit()

    WORKFLOW_COUNTERS["published_today"] += 1
    return {
        "draft_id": draft_id,
        "status": "published",
    }



def get_dashboard_summary() -> dict:
    with SessionLocal() as session:
        pending_candidates = session.scalar(
            select(func.count()).select_from(CandidateRecord).where(CandidateRecord.status != "drafted")
        ) or 0
        ready_for_review = session.scalar(
            select(func.count()).select_from(DraftRecord).where(DraftRecord.status == "ready_for_review")
        ) or 0

    summary = DashboardSummary(
        pending_candidates=pending_candidates,
        ready_for_review=ready_for_review,
        approved_today=WORKFLOW_COUNTERS["approved_today"],
        published_today=WORKFLOW_COUNTERS["published_today"],
        failed_jobs=WORKFLOW_COUNTERS["failed_jobs"],
    )
    return summary.model_dump()
