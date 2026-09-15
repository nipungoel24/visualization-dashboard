from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.db import get_database
from app.filters import FilterSpec, parse_overview_filters
from app.schemas import OverviewResponse
from app.services import get_overview

router = APIRouter(prefix="/api/v1", tags=["overview"])

FilterDep = Annotated[FilterSpec, Depends(parse_overview_filters)]


@router.get("/overview", response_model=OverviewResponse)
async def overview(request: Request, filters: FilterDep) -> OverviewResponse:
    database = get_database(request.app.state.client, request.app.state.settings)
    return await get_overview(database, filters)
