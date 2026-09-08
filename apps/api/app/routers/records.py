from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.db import get_database
from app.filters import FilterSpec, PaginationSpec, parse_filters, parse_pagination
from app.schemas import RecordItem, RecordsPage
from app.services import get_record, get_records

router = APIRouter(prefix="/api/v1", tags=["records"])

FilterDep = Annotated[FilterSpec, Depends(parse_filters)]
PaginationDep = Annotated[PaginationSpec, Depends(parse_pagination)]


@router.get("/records", response_model=RecordsPage)
async def records(request: Request, filters: FilterDep, pagination: PaginationDep) -> RecordsPage:
    database = get_database(request.app.state.client, request.app.state.settings)
    return await get_records(database, filters, pagination)


@router.get("/records/{record_id}", response_model=RecordItem)
async def record_detail(request: Request, record_id: str) -> RecordItem:
    database = get_database(request.app.state.client, request.app.state.settings)
    return await get_record(database, record_id)
