import hashlib

import httpx
import pytest

from app.normalize import EXPECTED_SOURCE_SHA256
from tests.helpers import normalized_records, source_records

pytestmark = pytest.mark.integration


def record_id(row_index: int) -> str:
    return hashlib.sha256(f"{EXPECTED_SOURCE_SHA256}:{row_index}".encode()).hexdigest()


class TestRecordsList:
    async def test_default_first_page(self, api_client: httpx.AsyncClient) -> None:
        response = await api_client.get("/api/v1/records")
        body = response.json()
        assert body["total"] == 1000
        assert body["page"] == 1
        assert body["page_size"] == 25
        assert body["total_pages"] == 40
        assert len(body["items"]) == 25
        assert [item["source_row_index"] for item in body["items"]] == list(range(25))

    async def test_later_page(self, api_client: httpx.AsyncClient) -> None:
        response = await api_client.get("/api/v1/records", params={"page": 2, "page_size": 25})
        body = response.json()
        assert body["total_pages"] == 40
        assert [item["source_row_index"] for item in body["items"]] == list(range(25, 50))

    async def test_max_page_size(self, api_client: httpx.AsyncClient) -> None:
        response = await api_client.get("/api/v1/records", params={"page_size": 100})
        body = response.json()
        assert len(body["items"]) == 100
        assert body["total_pages"] == 10

    async def test_filtering_uses_central_semantics(self, api_client: httpx.AsyncClient) -> None:
        records = normalized_records()
        expected = sum(1 for r in records if r["topic"] == "oil")
        response = await api_client.get("/api/v1/records", params=[("topic", "oil")])
        assert response.json()["total"] == expected

    async def test_search_matches_source(self, api_client: httpx.AsyncClient) -> None:
        records = normalized_records()
        fields = ("title", "insight", "topic", "sector", "source", "country", "region")
        needle = "energy"
        expected = sum(
            1 for r in records if any(r[field] and needle in r[field].lower() for field in fields)
        )
        response = await api_client.get("/api/v1/records", params={"q": needle})
        body = response.json()
        assert body["total"] == expected
        for item in body["items"]:
            haystack = " ".join(str(item[field]) for field in fields if item.get(field)).lower()
            assert needle in haystack

    async def test_search_treats_regex_metacharacters_literally(
        self, api_client: httpx.AsyncClient
    ) -> None:
        records = normalized_records()
        fields = ("title", "insight", "topic", "sector", "source", "country", "region")
        expected = sum(1 for r in records if any(r[field] and ".*" in r[field] for field in fields))
        response = await api_client.get("/api/v1/records", params={"q": ".*"})
        body = response.json()
        assert body["total"] == expected
        assert body["total"] < 1000

    async def test_search_for_period_suffix_matches_literal_text(
        self, api_client: httpx.AsyncClient
    ) -> None:
        records = normalized_records()
        fields = ("title", "insight", "topic", "sector", "source", "country", "region")
        expected = sum(
            1 for r in records if any(r[field] and "u.s." in r[field].lower() for field in fields)
        )
        response = await api_client.get("/api/v1/records", params={"q": "U.S."})
        assert response.json()["total"] == expected

    async def test_sort_ascending_and_descending(self, api_client: httpx.AsyncClient) -> None:
        ascending = await api_client.get(
            "/api/v1/records", params={"sort": "intensity", "order": "asc"}
        )
        values = [item["intensity"] for item in ascending.json()["items"]]
        non_null = [value for value in values if value is not None]
        assert non_null == sorted(non_null)

        descending = await api_client.get(
            "/api/v1/records", params={"sort": "intensity", "order": "desc"}
        )
        values = [item["intensity"] for item in descending.json()["items"]]
        non_null = [value for value in values if value is not None]
        assert non_null == sorted(non_null, reverse=True)

    async def test_default_sort_preserves_source_order(self, api_client: httpx.AsyncClient) -> None:
        response = await api_client.get("/api/v1/records", params={"page_size": 10})
        rows = [item["source_row_index"] for item in response.json()["items"]]
        assert rows == list(range(10))

    async def test_zero_results(self, api_client: httpx.AsyncClient) -> None:
        response = await api_client.get("/api/v1/records", params=[("country", "Atlantis")])
        body = response.json()
        assert response.status_code == 200
        assert body["total"] == 0
        assert body["items"] == []
        assert body["total_pages"] == 0


class TestRecordDetail:
    async def test_known_id_returns_record(self, api_client: httpx.AsyncClient) -> None:
        source_row = source_records()[0]
        response = await api_client.get(f"/api/v1/records/{record_id(0)}")
        assert response.status_code == 200
        body = response.json()
        assert body["id"] == record_id(0)
        assert body["source_row_index"] == 0
        assert body["title"] == source_row["title"]
        assert "source_dataset_sha256" not in body

    async def test_unknown_valid_id_returns_404(self, api_client: httpx.AsyncClient) -> None:
        response = await api_client.get(f"/api/v1/records/{'0' * 64}")
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "record_not_found"

    async def test_malformed_id_rejected(self, api_client: httpx.AsyncClient) -> None:
        response = await api_client.get("/api/v1/records/not-a-hex-id")
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "invalid_record_id"

    async def test_detail_matches_explorer_row(self, api_client: httpx.AsyncClient) -> None:
        listing = await api_client.get("/api/v1/records", params={"page_size": 1})
        item = listing.json()["items"][0]
        detail = await api_client.get(f"/api/v1/records/{item['id']}")
        assert detail.json() == item
