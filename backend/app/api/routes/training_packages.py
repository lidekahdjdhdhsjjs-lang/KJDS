"""API routes for training archive packages."""

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.schemas.common import ApiResponse
from app.repositories import training_archive_packages as repo

router = APIRouter(prefix="/training-packages", tags=["training-packages"])


class TrainingPackageCreate(BaseModel):
    store_id: str | None = None
    batch_id: str | None = None
    package_type: str
    storage_uri: str
    manifest_payload: str


@router.post("", response_model=ApiResponse[dict[str, Any]])
async def create_package(body: TrainingPackageCreate):
    """Create a new training archive package."""
    pkg = repo.create_package(
        store_id=body.store_id,
        batch_id=body.batch_id,
        package_type=body.package_type,
        storage_uri=body.storage_uri,
        manifest_payload=body.manifest_payload,
    )
    return ApiResponse(success=True, data=pkg)


@router.get("", response_model=ApiResponse[list[dict[str, Any]]])
async def list_packages(
    store_id: str | None = None,
    batch_id: str | None = None,
    package_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
):
    """List training archive packages with optional filters."""
    packages = repo.list_packages(
        store_id=store_id,
        batch_id=batch_id,
        package_type=package_type,
        limit=limit,
        offset=offset,
    )
    return ApiResponse(success=True, data=packages)


@router.get("/{package_id}", response_model=ApiResponse[dict[str, Any]])
async def get_package(package_id: str):
    """Get a package by ID."""
    pkg = repo.get_package(package_id)
    if pkg is None:
        raise HTTPException(status_code=404, detail="Package not found")
    return ApiResponse(success=True, data=pkg)
