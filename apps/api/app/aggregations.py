from app.filters import FACET_DIMENSIONS, FilterSpec, build_match

INSIGHTS_COLLECTION = "insights"
META_COLLECTION = "dataset_meta"
META_ID = "current"

SOURCES_OVERVIEW_LIMIT = 20

COVERAGE_FIELDS: tuple[str, ...] = (
    "end_year",
    "start_year",
    "intensity",
    "likelihood",
    "relevance",
    "topic",
    "sector",
    "region",
    "country",
    "pestle",
    "impact",
)

METRIC_BINS: dict[str, list[tuple[int, int]]] = {
    "intensity": [(1, 4), (5, 8), (9, 12), (13, 16), (17, 20), (21, 30), (31, 48), (49, 96)],
    "likelihood": [(1, 1), (2, 2), (3, 3), (4, 4)],
    "relevance": [(1, 1), (2, 2), (3, 3), (4, 4), (5, 5), (6, 6), (7, 7)],
}

DEFAULT_BUCKET = -1


def bucket_boundaries(bins: list[tuple[int, int]]) -> list[int]:
    """$bucket boundaries for inclusive bins; each bin is [lower, upper].

    Boundaries cover the validated pinned-dataset range (intensity 1-96,
    likelihood 1-4, relevance 1-7). Values outside the range land in the
    default bucket, surfaced as "outside range" by the API.
    """
    return sorted({lower for lower, _upper in bins}) + [max(upper for _lower, upper in bins) + 1]


def _metric_distribution(field: str) -> list[dict[str, object]]:
    return [
        {"$match": {field: {"$ne": None}}},
        {
            "$bucket": {
                "groupBy": f"${field}",
                "boundaries": bucket_boundaries(METRIC_BINS[field]),
                "default": DEFAULT_BUCKET,
                "output": {"count": {"$sum": 1}},
            }
        },
        {"$project": {"_id": 0, "lower": "$_id", "count": 1}},
    ]


def _missing(field: str) -> list[dict[str, object]]:
    return [{"$match": {field: None}}, {"$count": "n"}]


def _named_group(field: str, averages: tuple[str, ...]) -> list[dict[str, object]]:
    group: dict[str, object] = {
        "_id": f"${field}",
        "count": {"$sum": 1},
    }
    for metric in averages:
        group[f"avg_{metric}"] = {"$avg": f"${metric}"}
    return [
        {"$match": {field: {"$ne": None}}},
        {"$group": group},
        {"$sort": {"count": -1, "_id": 1}},
    ]


def _metric_summary(metric: str) -> dict[str, object]:
    return {
        f"avg_{metric}": {"$avg": f"${metric}"},
        f"{metric}_populated": {"$sum": {"$cond": [{"$ne": [f"${metric}", None]}, 1, 0]}},
    }


def build_overview_pipeline(match: dict[str, object]) -> list[dict[str, object]]:
    """One [$match, $facet] pipeline that computes every dashboard section from
    a single consistently filtered pass over the insights collection."""
    facet: dict[str, list[dict[str, object]]] = {}

    summary_group: dict[str, object] = {"_id": None, "filtered_count": {"$sum": 1}}
    summary_group.update(_metric_summary("intensity"))
    summary_group.update(_metric_summary("likelihood"))
    summary_group.update(_metric_summary("relevance"))
    facet["summary"] = [{"$group": summary_group}]

    facet["years"] = [{"$group": {"_id": "$end_year", "count": {"$sum": 1}}}]
    facet["years_missing"] = _missing("end_year")

    for field in ("intensity", "likelihood", "relevance"):
        facet[f"{field}_bins"] = _metric_distribution(field)
        facet[f"{field}_missing"] = _missing(field)

    facet["topics"] = _named_group("topic", ("intensity", "likelihood", "relevance"))
    facet["topics_missing"] = _missing("topic")
    facet["sectors"] = _named_group("sector", ("intensity",))
    facet["sectors_missing"] = _missing("sector")
    facet["pestle"] = _named_group("pestle", ("intensity", "likelihood", "relevance"))
    facet["pestle_missing"] = _missing("pestle")
    facet["regions"] = _named_group("region", ("intensity",))
    facet["regions_missing"] = _missing("region")
    facet["countries"] = _named_group("country", ("intensity",))
    facet["countries_missing"] = _missing("country")

    facet["sources"] = _named_group("source", ()) + [{"$limit": SOURCES_OVERVIEW_LIMIT}]
    facet["sources_missing"] = _missing("source")
    facet["sources_total_unique"] = [
        {"$match": {"source": {"$ne": None}}},
        {"$group": {"_id": "$source"}},
        {"$count": "n"},
    ]

    facet["landscape"] = _named_group("topic", ("intensity", "likelihood", "relevance"))
    facet["landscape_dominance"] = [
        {"$match": {"topic": {"$ne": None}}},
        {"$group": {"_id": {"topic": "$topic", "sector": "$sector"}, "n": {"$sum": 1}}},
        {
            "$project": {
                "topic": "$_id.topic",
                "sector": "$_id.sector",
                "n": 1,
                "is_null": {"$eq": ["$_id.sector", None]},
            }
        },
        {"$sort": {"topic": 1, "n": -1, "is_null": 1, "sector": 1}},
        {"$group": {"_id": "$topic", "dominant_sector": {"$first": "$sector"}}},
    ]

    for field in COVERAGE_FIELDS:
        facet[f"coverage_{field}"] = [
            {
                "$group": {
                    "_id": None,
                    "populated": {"$sum": {"$cond": [{"$ne": [f"${field}", None]}, 1, 0]}},
                }
            }
        ]

    pipeline: list[dict[str, object]] = [{"$facet": facet}]
    if match:
        pipeline.insert(0, {"$match": match})
    return pipeline


def build_facets_pipeline(spec: FilterSpec) -> list[dict[str, object]]:
    """Scoped/disjunctive facets: each dimension is counted with every active
    filter applied EXCEPT that dimension's own categorical selection, so a
    selected value never wipes out the alternatives in its own menu. Metric
    ranges and free-text search always remain active."""
    facet: dict[str, list[dict[str, object]]] = {}
    for dimension in FACET_DIMENSIONS:
        scoped = build_match(spec, exclude={dimension})
        facet[dimension] = [
            *([{"$match": scoped}] if scoped else []),
            {"$group": {"_id": f"${dimension}", "count": {"$sum": 1}}},
        ]
    return [{"$facet": facet}]
