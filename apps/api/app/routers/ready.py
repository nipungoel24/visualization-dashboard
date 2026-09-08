from typing import Any

from fastapi import APIRouter, Request, Response, status

router = APIRouter(prefix="/api/v1", tags=["health"])


@router.get("/ready")
async def ready(request: Request, response: Response) -> dict[str, Any]:
    client = request.app.state.client
    settings = request.app.state.settings
    try:
        await client.admin.command("ping")
    except Exception:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "not_ready", "database": "unreachable", "dataset": "unknown"}

    metadata = await client[settings.mongodb_db].dataset_meta.find_one({"_id": "current"})
    if metadata is None:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "not_ready", "database": "connected", "dataset": "not_seeded"}

    return {
        "status": "ready",
        "database": "connected",
        "dataset": "seeded",
        "document_count": metadata.get("document_count"),
    }
