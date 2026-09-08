import json
import os
import uuid
from collections.abc import AsyncIterator

import httpx
import pytest
from pymongo.asynchronous.mongo_client import AsyncMongoClient
from pymongo.errors import ServerSelectionTimeoutError

from app.config import Settings
from app.db import create_client
from app.main import create_app
from app.normalize import EXPECTED_SOURCE_SHA256, ValidationError
from app.seed import (
    DEFAULT_SOURCE_PATH,
    INDEXED_FIELDS,
    INSIGHTS_COLLECTION,
    META_COLLECTION,
    META_ID,
    seed_database,
)

TEST_URI = os.environ.get("MONGODB_TEST_URI")

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(TEST_URI is None, reason="MONGODB_TEST_URI not set"),
]


@pytest.fixture
async def test_db() -> AsyncIterator[tuple[AsyncMongoClient, str]]:
    if TEST_URI is None:
        pytest.skip("MONGODB_TEST_URI not set")
    db_name = f"insightscope_test_{uuid.uuid4().hex[:8]}"
    settings = Settings(mongodb_uri=TEST_URI, mongodb_db=db_name)  # type: ignore[arg-type]
    client = create_client(settings)
    try:
        await client.admin.command("ping")
    except ServerSelectionTimeoutError:
        pytest.skip("MongoDB unreachable")
    yield client, db_name
    await client.drop_database(db_name)
    await client.close()


class TestSeedIntegration:
    async def test_first_import_results_in_1000_records(
        self, test_db: tuple[AsyncMongoClient, str]
    ) -> None:
        client, db_name = test_db
        summary = await seed_database(client, db_name, DEFAULT_SOURCE_PATH)
        assert summary["documents_processed"] == 1000
        assert summary["documents_inserted"] == 1000
        assert summary["final_document_count"] == 1000
        assert summary["source_row_count"] == 1000
        assert summary["source_sha256"] == EXPECTED_SOURCE_SHA256
        assert await client[db_name][INSIGHTS_COLLECTION].count_documents({}) == 1000

    async def test_second_import_does_not_duplicate(
        self, test_db: tuple[AsyncMongoClient, str]
    ) -> None:
        client, db_name = test_db
        await seed_database(client, db_name, DEFAULT_SOURCE_PATH)
        second = await seed_database(client, db_name, DEFAULT_SOURCE_PATH)
        assert second["documents_processed"] == 1000
        assert second["documents_inserted"] == 0
        assert second["documents_matched"] == 1000
        assert second["stale_documents_removed"] == 0
        insights = client[db_name][INSIGHTS_COLLECTION]
        assert await insights.count_documents({}) == 1000
        assert len(await insights.distinct("_id")) == 1000

    async def test_metadata_is_written(self, test_db: tuple[AsyncMongoClient, str]) -> None:
        client, db_name = test_db
        await seed_database(client, db_name, DEFAULT_SOURCE_PATH)
        metadata = await client[db_name][META_COLLECTION].find_one({"_id": META_ID})
        assert metadata is not None
        assert metadata["source_filename"] == "jsondata.json"
        assert metadata["source_sha256"] == EXPECTED_SOURCE_SHA256
        assert metadata["document_count"] == 1000
        assert metadata["imported_at"]
        assert metadata["schema"]["field_availability"]["city"] is False
        assert metadata["schema"]["field_availability"]["swot"] is False
        assert metadata["schema"]["populated"]["intensity"] == 962

    async def test_expected_indexes_exist(self, test_db: tuple[AsyncMongoClient, str]) -> None:
        client, db_name = test_db
        await seed_database(client, db_name, DEFAULT_SOURCE_PATH)
        cursor = await client[db_name][INSIGHTS_COLLECTION].list_indexes()
        index_names = {index["name"] async for index in cursor}
        assert index_names >= {f"idx_{field}" for field in INDEXED_FIELDS}
        assert "_id_" in index_names

    async def test_hash_mismatch_refuses_import(
        self, test_db: tuple[AsyncMongoClient, str], tmp_path
    ) -> None:
        client, db_name = test_db
        tampered = tmp_path / "jsondata.json"
        records = json.loads(DEFAULT_SOURCE_PATH.read_text(encoding="utf-8"))
        records[0]["title"] = "tampered"
        tampered.write_text(json.dumps(records), encoding="utf-8")
        with pytest.raises(ValidationError, match="pinned hash"):
            await seed_database(client, db_name, tampered)
        assert await client[db_name][INSIGHTS_COLLECTION].count_documents({}) == 0

    async def test_invalid_dataset_leaves_existing_data_intact(
        self, test_db: tuple[AsyncMongoClient, str], tmp_path
    ) -> None:
        client, db_name = test_db
        await seed_database(client, db_name, DEFAULT_SOURCE_PATH)
        before = await client[db_name][INSIGHTS_COLLECTION].find_one(
            {}, sort=[("source_row_index", 1)]
        )

        invalid = tmp_path / "broken.json"
        invalid.write_text(json.dumps([{"only": "one record"}]), encoding="utf-8")
        with pytest.raises(ValidationError):
            await seed_database(client, db_name, invalid, pinned_sha256=None)

        insights = client[db_name][INSIGHTS_COLLECTION]
        assert await insights.count_documents({}) == 1000
        assert before is not None
        after = await insights.find_one({"_id": before["_id"]})
        assert after == before

    async def test_document_shape(self, test_db: tuple[AsyncMongoClient, str]) -> None:
        client, db_name = test_db
        await seed_database(client, db_name, DEFAULT_SOURCE_PATH)
        first = await client[db_name][INSIGHTS_COLLECTION].find_one(
            {}, sort=[("source_row_index", 1)]
        )
        assert first is not None
        assert first["source_row_index"] == 0
        assert first["source_dataset_sha256"] == EXPECTED_SOURCE_SHA256
        assert "_id" in first and not str(first["_id"]).startswith("ObjectId")
        assert "city" not in first and "swot" not in first

    async def test_ready_succeeds_with_seeded_database(
        self, test_db: tuple[AsyncMongoClient, str]
    ) -> None:
        client, db_name = test_db
        await seed_database(client, db_name, DEFAULT_SOURCE_PATH)
        settings = Settings(mongodb_uri=TEST_URI, mongodb_db=db_name)  # type: ignore[arg-type]
        application = create_app(settings)
        transport = httpx.ASGITransport(app=application)
        async with application.router.lifespan_context(application):
            async with httpx.AsyncClient(transport=transport, base_url="http://test") as http:
                response = await http.get("/api/v1/ready")
        assert response.status_code == 200
        assert response.json() == {
            "status": "ready",
            "database": "connected",
            "dataset": "seeded",
            "document_count": 1000,
        }
