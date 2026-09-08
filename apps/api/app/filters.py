import re
from dataclasses import dataclass
from typing import Annotated

from fastapi import Query, Request

from app.errors import ApiError

CATEGORICAL_PARAMS: dict[str, str] = {
    "topic": "topic",
    "sector": "sector",
    "region": "region",
    "pestle": "pestle",
    "source": "source",
    "country": "country",
}

YEAR_PARAMS: dict[str, str] = {
    "end_year": "end_year",
    "start_year": "start_year",
}

RANGE_PARAMS: dict[str, str] = {
    "intensity_min": "intensity",
    "intensity_max": "intensity",
    "likelihood_min": "likelihood",
    "likelihood_max": "likelihood",
    "relevance_min": "relevance",
    "relevance_max": "relevance",
}

FACET_DIMENSIONS: tuple[str, ...] = (
    "end_year",
    "start_year",
    "topic",
    "sector",
    "region",
    "pestle",
    "source",
    "country",
)

SEARCH_FIELDS: tuple[str, ...] = (
    "title",
    "insight",
    "topic",
    "sector",
    "source",
    "country",
    "region",
)

MAX_SEARCH_LENGTH = 100

SORTABLE_FIELDS: frozenset[str] = frozenset(
    {
        "source_row_index",
        "end_year",
        "start_year",
        "intensity",
        "likelihood",
        "relevance",
        "topic",
        "sector",
        "country",
    }
)

DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 100
DEFAULT_SORT = "source_row_index"

RECORD_ID_PATTERN = re.compile(r"^[0-9a-f]{64}$")

UNAVAILABLE_DIMENSIONS: dict[str, str] = {
    "city": "city",
    "swot": "swot",
}


@dataclass(frozen=True)
class FilterSpec:
    topic: tuple[str, ...] = ()
    sector: tuple[str, ...] = ()
    region: tuple[str, ...] = ()
    pestle: tuple[str, ...] = ()
    source: tuple[str, ...] = ()
    country: tuple[str, ...] = ()
    end_year: tuple[int, ...] = ()
    start_year: tuple[int, ...] = ()
    intensity_min: int | None = None
    intensity_max: int | None = None
    likelihood_min: int | None = None
    likelihood_max: int | None = None
    relevance_min: int | None = None
    relevance_max: int | None = None
    q: str | None = None

    def is_empty(self) -> bool:
        return self == FilterSpec()


@dataclass(frozen=True)
class PaginationSpec:
    page: int
    page_size: int
    sort: str
    order: int


def _clean_values(values: list[str]) -> tuple[str, ...]:
    cleaned = [value.strip() for value in values]
    return tuple(value for value in cleaned if value)


def _parse_years(raw: list[str], param: str) -> tuple[int, ...]:
    years: list[int] = []
    for value in raw:
        stripped = value.strip()
        if not stripped:
            continue
        try:
            years.append(int(stripped))
        except ValueError:
            raise ApiError(
                422,
                "validation_error",
                f"'{param}' must contain integer years, got '{value}'",
            ) from None
    return tuple(years)


def _parse_range(raw: str | None, param: str) -> int | None:
    if raw is None:
        return None
    stripped = raw.strip()
    if not stripped:
        return None
    try:
        return int(stripped)
    except ValueError:
        raise ApiError(
            422, "validation_error", f"'{param}' must be an integer, got '{raw}'"
        ) from None


def parse_filters(
    request: Request,
    topic: Annotated[list[str] | None, Query()] = None,
    sector: Annotated[list[str] | None, Query()] = None,
    region: Annotated[list[str] | None, Query()] = None,
    pestle: Annotated[list[str] | None, Query()] = None,
    source: Annotated[list[str] | None, Query()] = None,
    country: Annotated[list[str] | None, Query()] = None,
    end_year: Annotated[list[str] | None, Query()] = None,
    start_year: Annotated[list[str] | None, Query()] = None,
    intensity_min: Annotated[str | None, Query()] = None,
    intensity_max: Annotated[str | None, Query()] = None,
    likelihood_min: Annotated[str | None, Query()] = None,
    likelihood_max: Annotated[str | None, Query()] = None,
    relevance_min: Annotated[str | None, Query()] = None,
    relevance_max: Annotated[str | None, Query()] = None,
    q: Annotated[str | None, Query(max_length=MAX_SEARCH_LENGTH)] = None,
) -> FilterSpec:
    query_params = request.query_params
    for param, _dimension in UNAVAILABLE_DIMENSIONS.items():
        submitted = query_params.getlist(param)
        if any(value.strip() for value in submitted):
            raise ApiError(
                422,
                "unavailable_dimension",
                f"Filter dimension '{param}' is not available in the supplied dataset",
            )

    ranges = {
        "intensity": (intensity_min, intensity_max),
        "likelihood": (likelihood_min, likelihood_max),
        "relevance": (relevance_min, relevance_max),
    }
    parsed_ranges: dict[str, tuple[int | None, int | None]] = {}
    for dimension, (raw_min, raw_max) in ranges.items():
        parsed_min = _parse_range(raw_min, f"{dimension}_min")
        parsed_max = _parse_range(raw_max, f"{dimension}_max")
        if parsed_min is not None and parsed_max is not None and parsed_min > parsed_max:
            raise ApiError(
                422,
                "invalid_range",
                f"{dimension}_min ({parsed_min}) must not exceed {dimension}_max ({parsed_max})",
            )
        parsed_ranges[dimension] = (parsed_min, parsed_max)

    return FilterSpec(
        topic=_clean_values(topic or []),
        sector=_clean_values(sector or []),
        region=_clean_values(region or []),
        pestle=_clean_values(pestle or []),
        source=_clean_values(source or []),
        country=_clean_values(country or []),
        end_year=_parse_years(end_year or [], "end_year"),
        start_year=_parse_years(start_year or [], "start_year"),
        intensity_min=parsed_ranges["intensity"][0],
        intensity_max=parsed_ranges["intensity"][1],
        likelihood_min=parsed_ranges["likelihood"][0],
        likelihood_max=parsed_ranges["likelihood"][1],
        relevance_min=parsed_ranges["relevance"][0],
        relevance_max=parsed_ranges["relevance"][1],
        q=q.strip() if q and q.strip() else None,
    )


def build_match(spec: FilterSpec, *, exclude: set[str] | None = None) -> dict[str, object]:
    """Build the centralized Mongo $match stage.

    Within one dimension values combine with OR (Mongo `$in`); across dimensions
    constraints combine with AND (top-level `$and`). `exclude` drops a dimension's
    own categorical selection for scoped/disjunctive faceting.
    """
    excluded = exclude or set()
    conditions: list[dict[str, object]] = []

    for param, field_name in CATEGORICAL_PARAMS.items():
        values = getattr(spec, param)
        if values and param not in excluded:
            conditions.append({field_name: {"$in": list(values)}})

    for param, field_name in YEAR_PARAMS.items():
        values = getattr(spec, param)
        if values and param not in excluded:
            conditions.append({field_name: {"$in": list(values)}})

    for param, field_name in RANGE_PARAMS.items():
        value = getattr(spec, param)
        if value is None:
            continue
        operator = "$gte" if param.endswith("_min") else "$lte"
        conditions.append({field_name: {operator: value}})

    if spec.q:
        escaped = re.escape(spec.q)
        conditions.append(
            {
                "$or": [
                    {field_name: {"$regex": escaped, "$options": "i"}}
                    for field_name in SEARCH_FIELDS
                ]
            }
        )

    if not conditions:
        return {}
    if len(conditions) == 1:
        return conditions[0]
    return {"$and": conditions}


def parse_pagination(
    page: Annotated[int, Query(ge=1)] = DEFAULT_PAGE,
    page_size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
    sort: Annotated[str | None, Query()] = None,
    order: Annotated[str | None, Query()] = None,
) -> PaginationSpec:
    sort_field = (sort or DEFAULT_SORT).strip()
    if sort_field not in SORTABLE_FIELDS:
        raise ApiError(
            422,
            "invalid_sort",
            f"sort '{sort_field}' is not allowed; choose from {', '.join(sorted(SORTABLE_FIELDS))}",
        )
    order_value = (order or "asc").strip().lower()
    if order_value not in {"asc", "desc"}:
        raise ApiError(422, "invalid_sort", "order must be 'asc' or 'desc'")
    return PaginationSpec(
        page=page,
        page_size=page_size,
        sort=sort_field,
        order=1 if order_value == "asc" else -1,
    )


def validate_record_id(record_id: str) -> str:
    if not RECORD_ID_PATTERN.fullmatch(record_id):
        raise ApiError(
            422,
            "invalid_record_id",
            "record id must be a 64-character hexadecimal SHA-256 digest",
        )
    return record_id
