import httpx
import pytest

from app.normalize import EXPECTED_SOURCE_SHA256, SOURCE_FIELDS

pytestmark = pytest.mark.integration


class TestMetaEndpoint:
    async def test_meta_returns_authoritative_metadata(self, api_client: httpx.AsyncClient) -> None:
        response = await api_client.get("/api/v1/meta")
        assert response.status_code == 200
        body = response.json()
        assert body["source_filename"] == "jsondata.json"
        assert body["source_sha256"] == EXPECTED_SOURCE_SHA256
        assert body["source_row_count"] == 1000
        assert body["document_count"] == 1000
        assert body["imported_at"]
        assert body["import_version"] >= 1
        assert body["normalization_version"] >= 1
        assert body["api_version"]

    async def test_meta_schema_availability(self, api_client: httpx.AsyncClient) -> None:
        body = (await api_client.get("/api/v1/meta")).json()
        schema = body["schema"]
        assert set(schema["fields"]) == set(SOURCE_FIELDS)
        assert schema["field_availability"]["city"] is False
        assert schema["field_availability"]["swot"] is False
        assert all(schema["field_availability"][field] for field in SOURCE_FIELDS)
        assert schema["populated"]["intensity"] == 962
        assert schema["populated"]["country"] == 350

    async def test_meta_exposes_no_secrets(self, api_client: httpx.AsyncClient) -> None:
        body = (await api_client.get("/api/v1/meta")).json()
        serialized = str(body)
        for secret in ("mongodb://", "password", "secret", "credential", "C:\\"):
            assert secret not in serialized
