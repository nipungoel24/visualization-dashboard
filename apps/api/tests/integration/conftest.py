import os
import uuid
from collections.abc import AsyncIterator
from typing import Any

import httpx
import pytest
import pytest_asyncio
from pymongo.asynchronous.mongo_client import AsyncMongoClient
from pymongo.errors import ServerSelectionTimeoutError

from app.config import Settings
from app.db import create_client
from app.main import create_app
from app.seed import DEFAULT_SOURCE_PATH, seed_database

TEST_URI = os.environ.get("MONGODB_TEST_URI")


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def api_db() -> AsyncIterator[tuple[AsyncMongoClient, str]]:
    if TEST_URI is None:
        pytest.skip("MONGODB_TEST_URI not set")
    db_name = f"insightscope_test_api_{uuid.uuid4().hex[:8]}"
    settings = Settings(mongodb_uri=TEST_URI, mongodb_db=db_name)  # type: ignore[arg-type]
    client = create_client(settings)
    try:
        await seed_database(client, db_name, DEFAULT_SOURCE_PATH)
    except ServerSelectionTimeoutError:
        pytest.skip("MongoDB unreachable")
    yield client, db_name
    await client.drop_database(db_name)
    await client.close()


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def api_client(api_db: tuple[AsyncMongoClient, str]) -> AsyncIterator[httpx.AsyncClient]:
    _client, db_name = api_db
    settings = Settings(mongodb_uri=TEST_URI, mongodb_db=db_name)  # type: ignore[arg-type]
    app = create_app(settings)
    transport = httpx.ASGITransport(app=app)
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as http:
            yield http


async def get_json(client: httpx.AsyncClient, path: str, **params: Any) -> Any:
    response = await client.get(path, params=params)
    assert response.status_code == 200, response.text
    return response.json()
