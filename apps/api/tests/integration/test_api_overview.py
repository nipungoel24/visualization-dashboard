from collections import Counter

import httpx
import pytest

from app.aggregations import SOURCES_OVERVIEW_LIMIT
from tests.helpers import average, normalized_records

pytestmark = pytest.mark.integration


def expected_topic_counts(records: list[dict]) -> Counter[str]:
    return Counter(record["topic"] for record in records if record["topic"] is not None)


class TestOverviewSummary:
    async def test_unfiltered_count_is_1000(self, api_client: httpx.AsyncClient) -> None:
        response = await api_client.get("/api/v1/overview")
        assert response.status_code == 200
        assert response.json()["summary"]["filtered_count"] == 1000

    async def test_topic_filter_count_matches_source(self, api_client: httpx.AsyncClient) -> None:
        records = normalized_records()
        expected = [r for r in records if r["topic"] == "oil"]
        expected_avg = average([r["intensity"] for r in expected])
        assert expected_avg is not None
        response = await api_client.get("/api/v1/overview", params=[("topic", "oil")])
        summary = response.json()["summary"]
        assert summary["filtered_count"] == len(expected)
        assert summary["avg_intensity"] == round(expected_avg, 4)

    async def test_or_semantics_within_dimension(self, api_client: httpx.AsyncClient) -> None:
        records = normalized_records()
        expected = sum(1 for r in records if r["topic"] in {"oil", "gas"})
        response = await api_client.get(
            "/api/v1/overview", params=[("topic", "oil"), ("topic", "gas")]
        )
        assert response.json()["summary"]["filtered_count"] == expected

    async def test_and_semantics_across_dimensions(self, api_client: httpx.AsyncClient) -> None:
        records = normalized_records()
        expected = sum(
            1 for r in records if r["topic"] == "oil" and r["country"] == "United States of America"
        )
        response = await api_client.get(
            "/api/v1/overview",
            params=[("topic", "oil"), ("country", "United States of America")],
        )
        assert response.json()["summary"]["filtered_count"] == expected

    async def test_range_filter_matches_source(self, api_client: httpx.AsyncClient) -> None:
        records = normalized_records()
        expected = sum(
            1 for r in records if (r["intensity"] or 0) >= 10 and (r["intensity"] or 0) <= 20
        )
        response = await api_client.get(
            "/api/v1/overview", params={"intensity_min": 10, "intensity_max": 20}
        )
        assert response.json()["summary"]["filtered_count"] == expected

    async def test_averages_ignore_null(self, api_client: httpx.AsyncClient) -> None:
        records = normalized_records()
        topic_records = [r for r in records if r["topic"] == "energy"]
        expected_avg = average([r["intensity"] for r in topic_records])
        assert expected_avg is not None
        response = await api_client.get("/api/v1/overview", params=[("topic", "energy")])
        summary = response.json()["summary"]
        assert summary["avg_intensity"] == round(expected_avg, 4)
        assert summary["intensity_populated"] == sum(
            1 for r in topic_records if r["intensity"] is not None
        )

    async def test_top_sector_is_deterministic(self, api_client: httpx.AsyncClient) -> None:
        records = normalized_records()
        counts = Counter(r["sector"] for r in records if r["sector"] is not None)
        expected = sorted(counts.items(), key=lambda item: (-item[1], item[0]))[0][0]
        response = await api_client.get("/api/v1/overview")
        assert response.json()["summary"]["top_sector"] == expected


class TestOverviewSections:
    async def test_years_preserve_extreme_values(self, api_client: httpx.AsyncClient) -> None:
        records = normalized_records()
        expected = Counter(r["end_year"] for r in records if r["end_year"] is not None)
        response = await api_client.get("/api/v1/overview")
        years = response.json()["years"]
        values = {item["year"]: item["count"] for item in years["values"]}
        assert values[2126] == 1
        assert values[2200] == 1
        assert values == dict(expected)
        assert [item["year"] for item in years["values"]] == sorted(expected)
        assert years["missing_count"] == sum(1 for r in records if r["end_year"] is None)

    async def test_world_and_world_remain_distinct(self, api_client: httpx.AsyncClient) -> None:
        records = normalized_records()
        expected = Counter(r["region"] for r in records if r["region"] is not None)
        assert "World" in expected and "world" in expected
        response = await api_client.get("/api/v1/overview")
        regions = {
            item["region"]: item["record_count"] for item in response.json()["regions"]["values"]
        }
        assert regions["World"] == expected["World"]
        assert regions["world"] == expected["world"]

    async def test_topics_aggregation_matches_source(self, api_client: httpx.AsyncClient) -> None:
        records = normalized_records()
        expected = expected_topic_counts(records)
        response = await api_client.get("/api/v1/overview")
        topics = response.json()["topics"]
        assert len(topics["values"]) == len(expected)
        for item in topics["values"]:
            topic_records = [r for r in records if r["topic"] == item["topic"]]
            expected_avg = average([r["intensity"] for r in topic_records])
            assert expected_avg is not None
            assert item["record_count"] == len(topic_records)
            assert item["avg_intensity"] == round(expected_avg, 4)
        assert topics["missing_count"] == sum(1 for r in records if r["topic"] is None)

    async def test_sectors_aggregation_matches_source(self, api_client: httpx.AsyncClient) -> None:
        records = normalized_records()
        expected = Counter(r["sector"] for r in records if r["sector"] is not None)
        response = await api_client.get("/api/v1/overview")
        sectors = response.json()["sectors"]
        assert {item["sector"]: item["record_count"] for item in sectors["values"]} == dict(
            expected
        )

    async def test_pestle_aggregation_matches_source(self, api_client: httpx.AsyncClient) -> None:
        records = normalized_records()
        expected = Counter(r["pestle"] for r in records if r["pestle"] is not None)
        response = await api_client.get("/api/v1/overview")
        pestle = response.json()["pestle"]
        assert {item["pestle"]: item["record_count"] for item in pestle["values"]} == dict(expected)

    async def test_countries_aggregation_matches_source(
        self, api_client: httpx.AsyncClient
    ) -> None:
        records = normalized_records()
        expected = Counter(r["country"] for r in records if r["country"] is not None)
        response = await api_client.get("/api/v1/overview")
        countries = response.json()["countries"]
        assert {item["country"]: item["record_count"] for item in countries["values"]} == dict(
            expected
        )

    async def test_sources_ranking_is_limited(self, api_client: httpx.AsyncClient) -> None:
        records = normalized_records()
        expected = Counter(r["source"] for r in records if r["source"] is not None)
        response = await api_client.get("/api/v1/overview")
        sources = response.json()["sources"]
        assert len(sources["values"]) == SOURCES_OVERVIEW_LIMIT
        assert sources["total_unique"] == len(expected)
        assert sources["limited"] is True
        assert sources["limit"] == SOURCES_OVERVIEW_LIMIT

    async def test_landscape_dominant_sector_for_every_topic(
        self, api_client: httpx.AsyncClient
    ) -> None:
        records = normalized_records()
        per_topic_sector: dict[str, Counter[str]] = {}
        for record in records:
            topic = record["topic"]
            if topic is None:
                continue
            if record["sector"] is not None:
                per_topic_sector.setdefault(topic, Counter())[record["sector"]] += 1

        def dominant(topic: str) -> str | None:
            counts = per_topic_sector.get(topic)
            if not counts:
                return None
            return sorted(counts.items(), key=lambda item: (-item[1], item[0]))[0][0]

        response = await api_client.get("/api/v1/overview")
        landscape = {item["topic"]: item for item in response.json()["landscape"]["values"]}
        assert set(landscape) == set(per_topic_sector) | {
            topic for topic in expected_topic_counts(records) if dominant(topic) is None
        }
        for topic, item in landscape.items():
            assert item["dominant_sector"] == dominant(topic)
            topic_records = [r for r in records if r["topic"] == topic]
            assert item["record_count"] == len(topic_records)

    async def test_data_coverage_arithmetic(self, api_client: httpx.AsyncClient) -> None:
        records = normalized_records()
        response = await api_client.get("/api/v1/overview")
        coverage = {item["field"]: item for item in response.json()["data_coverage"]["values"]}
        assert coverage["end_year"]["populated_count"] == sum(
            1 for r in records if r["end_year"] is not None
        )
        assert coverage["end_year"]["missing_count"] == sum(
            1 for r in records if r["end_year"] is None
        )
        assert coverage["end_year"]["populated_percentage"] == 25.8
        for item in response.json()["data_coverage"]["values"]:
            assert item["populated_count"] + item["missing_count"] == 1000

    async def test_zero_result_filters_return_empty_success(
        self, api_client: httpx.AsyncClient
    ) -> None:
        response = await api_client.get("/api/v1/overview", params=[("country", "Atlantis")])
        assert response.status_code == 200
        body = response.json()
        assert body["summary"]["filtered_count"] == 0
        assert body["summary"]["avg_intensity"] is None
        assert body["summary"]["top_sector"] is None
        assert body["years"]["values"] == []
        assert body["topics"]["values"] == []
        assert body["landscape"]["values"] == []
        for item in body["data_coverage"]["values"]:
            assert item["populated_count"] == 0
            assert item["populated_percentage"] == 0.0
        for field in ("intensity", "likelihood", "relevance"):
            assert all(bin_["count"] == 0 for bin_ in body[field]["bins"])
            assert body[field]["not_specified"] == 0

    async def test_missing_values_never_become_fake_categories(
        self, api_client: httpx.AsyncClient
    ) -> None:
        response = await api_client.get("/api/v1/overview")
        topics = response.json()["topics"]
        assert all(item["topic"] for item in topics["values"])
        assert topics["missing_count"] > 0
