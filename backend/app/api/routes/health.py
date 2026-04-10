from fastapi import APIRouter

from app.schemas.common import ApiResponse

router = APIRouter()


@router.get("/health")
async def health() -> ApiResponse[dict[str, str]]:
    return ApiResponse(success=True, data={"status": "ok"})
