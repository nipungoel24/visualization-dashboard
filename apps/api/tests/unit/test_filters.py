from typing import Any, cast

import httpx
import pytest

from app.filters import FilterSpec, build_match
from app.main import create_app


async def request(path: str) -> httpx.Response:
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.get(path)


class TestBuildMatch:
    def test_no_filters_produces_empty_match(self) -> None:
        assert build_match(FilterSpec()) == {}

    def test_single_categorical_filter(self) -> None:
        assert build_match(FilterSpec(topic=("oil",))) == {"topic": {"$in": ["oil"]}}

    def test_repeated_topic_uses_or(self) -> None:
        assert build_match(FilterSpec(topic=("oil", "gas"))) == {"topic": {"$in": ["oil", "gas"]}}

    def test_multiple_dimensions_use_and(self) -> None:
        match = build_match(
            FilterSpec(topic=("oil", "gas"), country=("India",), pestle=("Economic",))
        )
        assert match == {
            "$and": [
                {"topic": {"$in": ["oil", "gas"]}},
                {"pestle": {"$in": ["Economic"]}},
                {"country": {"$in": ["India"]}},
            ]
        }

    def test_year_values(self) -> None:
        assert build_match(FilterSpec(end_year=(2020, 2021))) == {"end_year": {"$in": [2020, 2021]}}
        assert build_match(FilterSpec(start_year=(2017,))) == {"start_year": {"$in": [2017]}}

    def test_intensity_min(self) -> None:
        assert build_match(FilterSpec(intensity_min=6)) == {"intensity": {"$gte": 6}}

    def test_intensity_max(self) -> None:
        assert build_match(FilterSpec(intensity_max=20)) == {"intensity": {"$lte": 20}}

    def test_intensity_min_and_max(self) -> None:
        assert build_match(FilterSpec(intensity_min=6, intensity_max=20)) == {
            "$and": [{"intensity": {"$gte": 6}}, {"intensity": {"$lte": 20}}]
        }

    def test_likelihood_range(self) -> None:
        assert build_match(FilterSpec(likelihood_min=2, likelihood_max=4)) == {
            "$and": [{"likelihood": {"$gte": 2}}, {"likelihood": {"$lte": 4}}]
        }

    def test_relevance_range(self) -> None:
        assert build_match(FilterSpec(relevance_min=1, relevance_max=3)) == {
            "$and": [{"relevance": {"$gte": 1}}, {"relevance": {"$lte": 3}}]
        }

    def test_text_search_escapes_regex_metacharacters(self) -> None:
        match = build_match(FilterSpec(q=".*"))
        expected_fields = ("title", "insight", "topic", "sector", "source", "country", "region")
        or_conditions = cast(list[dict[str, Any]], match["$or"])
        assert len(or_conditions) == len(expected_fields)
        for condition in or_conditions:
            field, pattern = next(iter(condition.items()))
            assert field in expected_fields
            assert pattern == {"$regex": r"\.\*", "$options": "i"}

    def test_world_and_world_match_exactly(self) -> None:
        assert build_match(FilterSpec(region=("World",))) == {"region": {"$in": ["World"]}}
        assert build_match(FilterSpec(region=("world",))) == {"region": {"$in": ["world"]}}

    def test_exclude_drops_dimension_for_scoped_facets(self) -> None:
        spec = FilterSpec(topic=("oil",), country=("India",))
        match = build_match(spec, exclude={"topic"})
        assert match == {"country": {"$in": ["India"]}}

    def test_exclude_only_affects_requested_dimension(self) -> None:
        spec = FilterSpec(topic=("oil",), country=("India",), intensity_min=6)
        match = build_match(spec, exclude={"topic"})
        assert match == {"$and": [{"country": {"$in": ["India"]}}, {"intensity": {"$gte": 6}}]}


class TestFilterValidation:
    @pytest.mark.asyncio
    async def test_unavailable_city_dimension(self) -> None:
        response = await request("/api/v1/overview?city=Sydney")
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "unavailable_dimension"

    @pytest.mark.asyncio
    async def test_unavailable_swot_dimension(self) -> None:
        response = await request("/api/v1/overview?swot=Strength")
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "unavailable_dimension"

    @pytest.mark.asyncio
    async def test_empty_city_value_is_ignored_but_reaches_database(self) -> None:
        response = await request("/api/v1/overview?city=")
        assert response.status_code in (200, 503)

    @pytest.mark.asyncio
    async def test_invalid_range_rejected(self) -> None:
        response = await request("/api/v1/overview?intensity_min=20&intensity_max=10")
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "invalid_range"

    @pytest.mark.asyncio
    async def test_likelihood_invalid_range_rejected(self) -> None:
        response = await request("/api/v1/overview?likelihood_min=4&likelihood_max=1")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_relevance_invalid_range_rejected(self) -> None:
        response = await request("/api/v1/overview?relevance_min=7&relevance_max=2")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_non_numeric_range_rejected(self) -> None:
        response = await request("/api/v1/overview?intensity_min=abc")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_non_numeric_year_rejected(self) -> None:
        response = await request("/api/v1/overview?end_year=abc")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_search_length_limited(self) -> None:
        response = await request(f"/api/v1/overview?q={'x' * 101}")
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "validation_error"


class TestPaginationValidation:
    @pytest.mark.asyncio
    async def test_page_zero_rejected(self) -> None:
        response = await request("/api/v1/records?page=0")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_page_size_zero_rejected(self) -> None:
        response = await request("/api/v1/records?page_size=0")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_page_size_over_max_rejected(self) -> None:
        response = await request("/api/v1/records?page_size=101")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_sort_rejected(self) -> None:
        response = await request("/api/v1/records?sort=hack")
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "invalid_sort"

    @pytest.mark.asyncio
    async def test_invalid_order_rejected(self) -> None:
        response = await request("/api/v1/records?order=sideways")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_malformed_record_id_rejected(self) -> None:
        response = await request("/api/v1/records/abc")
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "invalid_record_id"


class TestUnavailableDatabase:
    async def make_unreachable_client(self) -> httpx.AsyncClient:
        from app.config import Settings

        app = create_app(
            Settings(
                mongodb_uri="mongodb://localhost:59999",
                mongodb_db="insightscope",
                mongodb_server_selection_timeout_ms=300,
            )
        )
        transport = httpx.ASGITransport(app=app)
        async with app.router.lifespan_context(app):
            return httpx.AsyncClient(transport=transport, base_url="http://test")

    @pytest.mark.asyncio
    async def test_overview_reports_database_unavailable(self) -> None:
        client = await self.make_unreachable_client()
        async with client:
            response = await client.get("/api/v1/overview")
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "database_unavailable"

    @pytest.mark.asyncio
    async def test_records_report_database_unavailable(self) -> None:
        client = await self.make_unreachable_client()
        async with client:
            response = await client.get("/api/v1/records")
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "database_unavailable"
