"""Repository for FeedbackRecord operations."""

from typing import Any

from app.db import SessionLocal
from app.models import FeedbackRecordRecord


def create_feedback(
    opportunity_item_id: str,
    feedback_type: str,
    source_type: str,
    before_payload: str,
    after_payload: str,
    reviewer_ref: str | None = None,
) -> dict[str, Any]:
    """Create a new feedback record."""
    import uuid
    from datetime import datetime, UTC

    with SessionLocal() as session:
        feedback = FeedbackRecordRecord(
            id=f"fb-{uuid.uuid4().hex[:16]}",
            opportunity_item_id=opportunity_item_id,
            feedback_type=feedback_type,
            source_type=source_type,
            reviewer_ref=reviewer_ref,
            before_payload=before_payload,
            after_payload=after_payload,
            review_status="pending",
            created_at=datetime.now(UTC),
        )
        session.add(feedback)
        session.commit()
        session.refresh(feedback)
        return {
            "id": feedback.id,
            "opportunity_item_id": feedback.opportunity_item_id,
            "feedback_type": feedback.feedback_type,
            "source_type": feedback.source_type,
            "reviewer_ref": feedback.reviewer_ref,
            "before_payload": feedback.before_payload,
            "after_payload": feedback.after_payload,
            "review_status": feedback.review_status,
            "created_at": feedback.created_at.isoformat(),
        }


def list_feedback(
    opportunity_item_id: str | None = None,
    feedback_type: str | None = None,
    review_status: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """List feedback records with optional filters."""
    with SessionLocal() as session:
        query = session.query(FeedbackRecordRecord)
        if opportunity_item_id:
            query = query.filter(FeedbackRecordRecord.opportunity_item_id == opportunity_item_id)
        if feedback_type:
            query = query.filter(FeedbackRecordRecord.feedback_type == feedback_type)
        if review_status:
            query = query.filter(FeedbackRecordRecord.review_status == review_status)
        records = query.order_by(FeedbackRecordRecord.created_at.desc()).offset(offset).limit(limit).all()
        return [
            {
                "id": r.id,
                "opportunity_item_id": r.opportunity_item_id,
                "feedback_type": r.feedback_type,
                "source_type": r.source_type,
                "reviewer_ref": r.reviewer_ref,
                "before_payload": r.before_payload,
                "after_payload": r.after_payload,
                "review_status": r.review_status,
                "created_at": r.created_at.isoformat(),
            }
            for r in records
        ]


def get_feedback(feedback_id: str) -> dict[str, Any] | None:
    """Get a feedback record by ID."""
    with SessionLocal() as session:
        feedback = session.query(FeedbackRecordRecord).filter(
            FeedbackRecordRecord.id == feedback_id
        ).first()
        if feedback is None:
            return None
        return {
            "id": feedback.id,
            "opportunity_item_id": feedback.opportunity_item_id,
            "feedback_type": feedback.feedback_type,
            "source_type": feedback.source_type,
            "reviewer_ref": feedback.reviewer_ref,
            "before_payload": feedback.before_payload,
            "after_payload": feedback.after_payload,
            "review_status": feedback.review_status,
            "created_at": feedback.created_at.isoformat(),
        }


def approve_feedback(feedback_id: str) -> dict[str, Any] | None:
    """Approve a feedback record."""
    with SessionLocal() as session:
        feedback = session.query(FeedbackRecordRecord).filter(
            FeedbackRecordRecord.id == feedback_id
        ).first()
        if feedback is None:
            return None
        feedback.review_status = "approved"
        session.commit()
        return {
            "id": feedback.id,
            "review_status": feedback.review_status,
        }


def reject_feedback(feedback_id: str) -> dict[str, Any] | None:
    """Reject a feedback record."""
    with SessionLocal() as session:
        feedback = session.query(FeedbackRecordRecord).filter(
            FeedbackRecordRecord.id == feedback_id
        ).first()
        if feedback is None:
            return None
        feedback.review_status = "rejected"
        session.commit()
        return {
            "id": feedback.id,
            "review_status": feedback.review_status,
        }
