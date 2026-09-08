from collections import Counter

import httpx
import pytest

from tests.helpers import normalized_records

pytestmark = pytest.mark.integration

UNITED_STATES = "United States of America"


def facet_values(dimension: dict) -> dict:
    return {item["value"]: item["count"] for item in dimension["values"]}


class TestFacetsScoping:
    async def test_topic_facet_is_scoped_without_self_restriction(
        self, api_client: httpx.AsyncClient
    ) -> None:
        records = normalized_records()
        us_records = [r for r in records if r["country"] == UNITED_STATES]
        expected = Counter(r["topic"] for r in us_records if r["topic"] is not None)

        response = await api_client.get(
            "/api/v1/facets",
            params=[("topic", "oil"), ("country", UNITED_STATES)],
        )
        topic_facet = response.json()["topic"]
        values = facet_values(topic_facet)
        assert values == dict(expected)
        assert topic_facet["missing_count"] == sum(1 for r in us_records if r["topic"] is None)
        assert values.get("oil", 0) > 0

    async def test_country_facet_is_scoped_without_self_restriction(
        self, api_client: httpx.AsyncClient
    ) -> None:
        records = normalized_records()
        oil_records = [r for r in records if r["topic"] == "oil"]
        expected = Counter(r["country"] for r in oil_records if r["country"] is not None)

        response = await api_client.get(
            "/api/v1/facets",
            params=[("topic", "oil"), ("country", UNITED_STATES)],
        )
        country_facet = response.json()["country"]
        values = facet_values(country_facet)
        assert values == dict(expected)
        assert values.get(UNITED_STATES, 0) > 0
        assert country_facet["missing_count"] == sum(1 for r in oil_records if r["country"] is None)

    async def test_metric_ranges_remain_active_in_facets(
        self, api_client: httpx.AsyncClient
    ) -> None:
        records = normalized_records()
        scoped = [r for r in records if r["intensity"] is not None and r["intensity"] >= 50]
        expected = Counter(r["topic"] for r in scoped if r["topic"] is not None)

        response = await api_client.get("/api/v1/facets", params={"intensity_min": 50})
        topic_facet = response.json()["topic"]
        assert facet_values(topic_facet) == dict(expected)
        assert topic_facet["missing_count"] == sum(1 for r in scoped if r["topic"] is None)


class TestFacetsShape:
    async def test_null_values_never_appear_as_facet_values(
        self, api_client: httpx.AsyncClient
    ) -> None:
        response = await api_client.get("/api/v1/facets")
        for dimension in response.json().values():
            assert all(
                item["value"] is not None and item["value"] != "" for item in dimension["values"]
            )

    async def test_missing_counts_match_source(self, api_client: httpx.AsyncClient) -> None:
        records = normalized_records()
        expected = {
            "topic": 93,
            "sector": 229,
            "region": 453,
            "pestle": 93,
            "source": 1,
            "country": 650,
            "end_year": 742,
            "start_year": 690,
        }
        for field, count in expected.items():
            assert sum(1 for r in records if r[field] is None) == count
        response = await api_client.get("/api/v1/facets")
        for field, count in expected.items():
            assert response.json()[field]["missing_count"] == count

    async def test_deterministic_categorical_ordering(self, api_client: httpx.AsyncClient) -> None:
        response = await api_client.get("/api/v1/facets")
        for field in ("topic", "sector", "region", "pestle", "source", "country"):
            values = response.json()[field]["values"]
            assert values == sorted(values, key=lambda item: (-item["count"], item["value"]))

    async def test_year_facets_are_numerically_ascending(
        self, api_client: httpx.AsyncClient
    ) -> None:
        records = normalized_records()
        response = await api_client.get("/api/v1/facets")
        for field in ("end_year", "start_year"):
            expected = Counter(r[field] for r in records if r[field] is not None)
            values = response.json()[field]["values"]
            assert [item["value"] for item in values] == sorted(expected)
            assert {item["value"]: item["count"] for item in values} == dict(expected)

    async def test_source_facet_contains_complete_list(self, api_client: httpx.AsyncClient) -> None:
        records = normalized_records()
        expected = Counter(r["source"] for r in records if r["source"] is not None)
        response = await api_client.get("/api/v1/facets")
        source_facet = response.json()["source"]
        assert len(source_facet["values"]) == len(expected)
        assert facet_values(source_facet) == dict(expected)

    async def test_zero_result_filters_produce_empty_facets(
        self, api_client: httpx.AsyncClient
    ) -> None:
        response = await api_client.get("/api/v1/facets", params=[("country", "Atlantis")])
        assert response.status_code == 200
        for dimension in response.json().values():
            assert dimension["values"] == []
            assert dimension["missing_count"] == 0
