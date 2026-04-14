"""Repository for TrainingArchivePackage operations."""

from typing import Any

from app.db import SessionLocal
from app.models import TrainingArchivePackageRecord


def create_package(
    package_type: str,
    storage_uri: str,
    manifest_payload: str,
    store_id: str | None = None,
    batch_id: str | None = None,
) -> dict[str, Any]:
    """Create a new training archive package."""
    import uuid
    from datetime import datetime, UTC

    with SessionLocal() as session:
        package = TrainingArchivePackageRecord(
            id=f"tap-{uuid.uuid4().hex[:16]}",
            store_id=store_id,
            batch_id=batch_id,
            package_type=package_type,
            storage_uri=storage_uri,
            manifest_payload=manifest_payload,
            created_at=datetime.now(UTC),
        )
        session.add(package)
        session.commit()
        session.refresh(package)
        return {
            "id": package.id,
            "store_id": package.store_id,
            "batch_id": package.batch_id,
            "package_type": package.package_type,
            "storage_uri": package.storage_uri,
            "manifest_payload": package.manifest_payload,
            "created_at": package.created_at.isoformat(),
        }


def list_packages(
    store_id: str | None = None,
    batch_id: str | None = None,
    package_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """List training archive packages with optional filters."""
    with SessionLocal() as session:
        query = session.query(TrainingArchivePackageRecord)
        if store_id:
            query = query.filter(TrainingArchivePackageRecord.store_id == store_id)
        if batch_id:
            query = query.filter(TrainingArchivePackageRecord.batch_id == batch_id)
        if package_type:
            query = query.filter(TrainingArchivePackageRecord.package_type == package_type)
        packages = query.order_by(TrainingArchivePackageRecord.created_at.desc()).offset(offset).limit(limit).all()
        return [
            {
                "id": p.id,
                "store_id": p.store_id,
                "batch_id": p.batch_id,
                "package_type": p.package_type,
                "storage_uri": p.storage_uri,
                "manifest_payload": p.manifest_payload,
                "created_at": p.created_at.isoformat(),
            }
            for p in packages
        ]


def get_package(package_id: str) -> dict[str, Any] | None:
    """Get a package by ID."""
    with SessionLocal() as session:
        package = session.query(TrainingArchivePackageRecord).filter(
            TrainingArchivePackageRecord.id == package_id
        ).first()
        if package is None:
            return None
        return {
            "id": package.id,
            "store_id": package.store_id,
            "batch_id": package.batch_id,
            "package_type": package.package_type,
            "storage_uri": package.storage_uri,
            "manifest_payload": package.manifest_payload,
            "created_at": package.created_at.isoformat(),
        }
