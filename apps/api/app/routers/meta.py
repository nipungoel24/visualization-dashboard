from fastapi import APIRouter, Request

from app.db import get_database
from app.schemas import MetaResponse
from app.services import get_metadata

router = APIRouter(prefix="/api/v1", tags=["meta"])


@router.get("/meta", response_model=MetaResponse)
async def meta(request: Request) -> MetaResponse:
    database = get_database(request.app.state.client, request.app.state.settings)
    return await get_metadata(database)
