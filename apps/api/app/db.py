from pymongo.asynchronous.database import AsyncDatabase
from pymongo.asynchronous.mongo_client import AsyncMongoClient

from app.config import Settings


def create_client(settings: Settings) -> AsyncMongoClient:
    return AsyncMongoClient(
        settings.mongodb_uri,
        serverSelectionTimeoutMS=settings.mongodb_server_selection_timeout_ms,
        appname="insightscope-api",
    )


def get_database(client: AsyncMongoClient, settings: Settings) -> AsyncDatabase:
    return client[settings.mongodb_db]
