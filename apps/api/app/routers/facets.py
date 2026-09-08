from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.db import get_database
from app.filters import FilterSpec, parse_filters
from app.schemas import FacetsResponse
from app.services import get_facets

router = APIRouter(prefix="/api/v1", tags=["facets"])

FilterDep = Annotated[FilterSpec, Depends(parse_filters)]


@router.get("/facets", response_model=FacetsResponse)
async def facets(request: Request, filters: FilterDep) -> FacetsResponse:
    database = get_database(request.app.state.client, request.app.state.settings)
    return await get_facets(database, filters)
