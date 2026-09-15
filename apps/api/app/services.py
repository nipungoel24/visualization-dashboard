from typing import Any

from pymongo.asynchronous.database import AsyncDatabase

from app import aggregations
from app.errors import ApiError
from app.filters import (
    FACET_DIMENSIONS,
    FilterSpec,
    PaginationSpec,
    build_match,
    validate_record_id,
)
from app.schemas import (
    API_VERSION,
    CountriesSection,
    CountryAnalytics,
    CoverageField,
    DataCoverageSection,
    FacetDimension,
    FacetsResponse,
    FacetValue,
    LandscapeSection,
    LandscapeTopic,
    MetaResponse,
    MetaSchema,
    MetricBin,
    MetricDistribution,
    OverviewResponse,
    PestleAnalytics,
    PestleSection,
    RecordItem,
    RecordsPage,
    RegionAnalytics,
    RegionsSection,
    SectorAnalytics,
    SectorsSection,
    SourceAnalytics,
    SourcesSection,
    SummarySection,
    TopicAnalytics,
    TopicsSection,
    YearCount,
    YearsSection,
)

ROUND_DIGITS = 4

RECORD_PROJECTION = {"source_dataset_sha256": 0}


def _round(value: Any) -> float | None:
    return round(float(value), ROUND_DIGITS) if value is not None else None


def _missing_count(raw: list[dict[str, Any]]) -> int:
    if not raw:
        return 0
    return int(raw[0]["n"])


def _map_record(document: dict[str, Any]) -> RecordItem:
    return RecordItem(
        id=str(document["_id"]),
        source_row_index=document["source_row_index"],
        end_year=document.get("end_year"),
        intensity=document.get("intensity"),
        sector=document.get("sector"),
        topic=document.get("topic"),
        insight=document.get("insight"),
        url=document.get("url"),
        region=document.get("region"),
        start_year=document.get("start_year"),
        impact=document.get("impact"),
        added=document.get("added"),
        published=document.get("published"),
        country=document.get("country"),
        relevance=document.get("relevance"),
        pestle=document.get("pestle"),
        source=document.get("source"),
        title=document.get("title"),
        likelihood=document.get("likelihood"),
    )


def _map_distribution(raw: list[dict[str, Any]], field: str) -> MetricDistribution:
    counts = {entry["lower"]: entry["count"] for entry in raw}
    bins = []
    for lower, upper in aggregations.METRIC_BINS[field]:
        label = str(lower) if lower == upper else f"{lower}-{upper}"
        bins.append(MetricBin(label=label, min=lower, max=upper, count=counts.get(lower, 0)))
    outside = counts.get(aggregations.DEFAULT_BUCKET, 0)
    if outside:
        raise ApiError(
            500,
            "internal_error",
            f"metric '{field}' contains values outside the supported range",
        )
    return MetricDistribution(bins=bins, not_specified=0)


async def get_metadata(db: AsyncDatabase) -> MetaResponse:
    document = await db[aggregations.META_COLLECTION].find_one({"_id": aggregations.META_ID})
    if document is None:
        raise ApiError(
            503,
            "dataset_not_seeded",
            "The dataset has not been imported yet; run the seed command first",
        )
    schema = document["schema"]
    return MetaResponse(
        source_filename=document["source_filename"],
        source_sha256=document["source_sha256"],
        source_row_count=document["source_row_count"],
        document_count=document["document_count"],
        imported_at=document["imported_at"],
        import_version=document["import_version"],
        normalization_version=document["normalization_version"],
        api_version=API_VERSION,
        dataset_schema=MetaSchema(
            fields=schema["fields"],
            field_availability=schema["field_availability"],
            populated=schema["populated"],
        ),
    )


async def get_overview(db: AsyncDatabase, spec: FilterSpec) -> OverviewResponse:
    pipeline = aggregations.build_overview_pipeline(build_match(spec))
    cursor = await db[aggregations.INSIGHTS_COLLECTION].aggregate(pipeline)
    raw_list = await cursor.to_list(length=1)
    facet = raw_list[0] if raw_list else {}

    summary_raw = (facet.get("summary") or [{}])[0]
    filtered = int(summary_raw.get("filtered_count", 0))

    sectors = [
        SectorAnalytics(
            sector=entry["_id"],
            record_count=entry["count"],
            avg_intensity=_round(entry.get("avg_intensity")),
        )
        for entry in facet.get("sectors") or []
    ]
    complete_metrics_populated = summary_raw.get("complete_metrics_populated", 0)
    complete_metrics_percentage = (
        round(complete_metrics_populated / filtered * 100, 2) if filtered else 0.0
    )

    summary = SummarySection(
        filtered_count=filtered,
        avg_intensity=_round(summary_raw.get("avg_intensity")),
        intensity_populated=summary_raw.get("intensity_populated", 0),
        avg_likelihood=_round(summary_raw.get("avg_likelihood")),
        likelihood_populated=summary_raw.get("likelihood_populated", 0),
        avg_relevance=_round(summary_raw.get("avg_relevance")),
        relevance_populated=summary_raw.get("relevance_populated", 0),
        complete_metrics_populated=complete_metrics_populated,
        complete_metrics_percentage=complete_metrics_percentage,
        top_sector=sectors[0].sector if sectors else None,
    )

    years_values = [
        YearCount(year=int(entry["_id"]), count=entry["count"])
        for entry in facet.get("years") or []
        if entry["_id"] is not None
    ]
    years_values.sort(key=lambda item: item.year)
    years = YearsSection(
        values=years_values,
        missing_count=_missing_count(facet.get("years_missing") or []),
    )

    metric_sections: dict[str, MetricDistribution] = {}
    for field in ("intensity", "likelihood", "relevance"):
        distribution = _map_distribution(facet.get(f"{field}_bins") or [], field)
        distribution.not_specified = _missing_count(facet.get(f"{field}_missing") or [])
        metric_sections[field] = distribution

    topics = TopicsSection(
        values=[
            TopicAnalytics(
                topic=entry["_id"],
                record_count=entry["count"],
                avg_intensity=_round(entry.get("avg_intensity")),
                avg_likelihood=_round(entry.get("avg_likelihood")),
                avg_relevance=_round(entry.get("avg_relevance")),
            )
            for entry in facet.get("topics") or []
        ],
        missing_count=_missing_count(facet.get("topics_missing") or []),
    )

    sectors_section = SectorsSection(
        values=sectors,
        missing_count=_missing_count(facet.get("sectors_missing") or []),
    )

    pestle = PestleSection(
        values=[
            PestleAnalytics(
                pestle=entry["_id"],
                record_count=entry["count"],
                avg_intensity=_round(entry.get("avg_intensity")),
                avg_likelihood=_round(entry.get("avg_likelihood")),
                avg_relevance=_round(entry.get("avg_relevance")),
            )
            for entry in facet.get("pestle") or []
        ],
        missing_count=_missing_count(facet.get("pestle_missing") or []),
    )

    regions = RegionsSection(
        values=[
            RegionAnalytics(
                region=entry["_id"],
                record_count=entry["count"],
                avg_intensity=_round(entry.get("avg_intensity")),
            )
            for entry in facet.get("regions") or []
        ],
        missing_count=_missing_count(facet.get("regions_missing") or []),
    )

    countries = CountriesSection(
        values=[
            CountryAnalytics(
                country=entry["_id"],
                record_count=entry["count"],
                avg_intensity=_round(entry.get("avg_intensity")),
            )
            for entry in facet.get("countries") or []
        ],
        missing_count=_missing_count(facet.get("countries_missing") or []),
    )

    source_entries = facet.get("sources") or []
    sources_total_unique = _missing_count(facet.get("sources_total_unique") or [])
    sources = SourcesSection(
        values=[
            SourceAnalytics(source=entry["_id"], record_count=entry["count"])
            for entry in source_entries
        ],
        missing_count=_missing_count(facet.get("sources_missing") or []),
        total_unique=sources_total_unique,
        limit=aggregations.SOURCES_OVERVIEW_LIMIT,
        limited=sources_total_unique > len(source_entries),
    )

    dominance = {
        entry["_id"]: entry["dominant_sector"] for entry in facet.get("landscape_dominance") or []
    }
    landscape = LandscapeSection(
        values=[
            LandscapeTopic(
                topic=entry["_id"],
                record_count=entry["count"],
                avg_intensity=_round(entry.get("avg_intensity")),
                avg_likelihood=_round(entry.get("avg_likelihood")),
                avg_relevance=_round(entry.get("avg_relevance")),
                dominant_sector=dominance.get(entry["_id"]),
            )
            for entry in facet.get("landscape") or []
        ]
    )

    coverage_values = []
    for field in aggregations.COVERAGE_FIELDS:
        populated = (facet.get(f"coverage_{field}") or [{}])[0].get("populated", 0)
        missing = filtered - populated
        percentage = round(populated / filtered * 100, 2) if filtered else 0.0
        coverage_values.append(
            CoverageField(
                field=field,
                populated_count=populated,
                missing_count=missing,
                populated_percentage=percentage,
            )
        )

    return OverviewResponse(
        summary=summary,
        intensity=metric_sections["intensity"],
        likelihood=metric_sections["likelihood"],
        relevance=metric_sections["relevance"],
        years=years,
        topics=topics,
        sectors=sectors_section,
        pestle=pestle,
        regions=regions,
        countries=countries,
        sources=sources,
        landscape=landscape,
        data_coverage=DataCoverageSection(values=coverage_values),
    )


async def get_facets(db: AsyncDatabase, spec: FilterSpec) -> FacetsResponse:
    pipeline = aggregations.build_facets_pipeline(spec)
    cursor = await db[aggregations.INSIGHTS_COLLECTION].aggregate(pipeline)
    raw_list = await cursor.to_list(length=1)
    facet = raw_list[0] if raw_list else {}

    dimensions: dict[str, FacetDimension] = {}
    for dimension in FACET_DIMENSIONS:
        entries = facet.get(dimension) or []
        missing_count = 0
        values = []
        for entry in entries:
            if entry["_id"] is None:
                missing_count = int(entry["count"])
            else:
                values.append(FacetValue(value=entry["_id"], count=entry["count"]))
        if dimension in ("end_year", "start_year"):
            values.sort(key=lambda item: item.value)
        else:
            values.sort(key=lambda item: (-item.count, item.value))
        dimensions[dimension] = FacetDimension(values=values, missing_count=missing_count)

    return FacetsResponse(
        end_year=dimensions["end_year"],
        start_year=dimensions["start_year"],
        topic=dimensions["topic"],
        sector=dimensions["sector"],
        region=dimensions["region"],
        pestle=dimensions["pestle"],
        source=dimensions["source"],
        country=dimensions["country"],
    )


async def get_records(
    db: AsyncDatabase, spec: FilterSpec, pagination: PaginationSpec
) -> RecordsPage:
    collection = db[aggregations.INSIGHTS_COLLECTION]
    match = build_match(spec)
    total = await collection.count_documents(match)
    if total == 0:
        return RecordsPage(
            items=[],
            total=0,
            page=pagination.page,
            page_size=pagination.page_size,
            total_pages=0,
        )
    cursor = collection.find(match, RECORD_PROJECTION)
    cursor = (
        cursor.sort(pagination.sort, pagination.order)
        .skip((pagination.page - 1) * pagination.page_size)
        .limit(pagination.page_size)
    )
    documents = await cursor.to_list(length=pagination.page_size)
    total_pages = (total + pagination.page_size - 1) // pagination.page_size
    return RecordsPage(
        items=[_map_record(document) for document in documents],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        total_pages=total_pages,
    )


async def get_record(db: AsyncDatabase, record_id: str) -> RecordItem:
    validate_record_id(record_id)
    document = await db[aggregations.INSIGHTS_COLLECTION].find_one(
        {"_id": record_id}, RECORD_PROJECTION
    )
    if document is None:
        raise ApiError(404, "record_not_found", "No record exists with this id")
    return _map_record(document)
