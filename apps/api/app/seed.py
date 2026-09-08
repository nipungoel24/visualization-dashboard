import argparse
import asyncio
import hashlib
import json
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from pymongo import ReplaceOne
from pymongo.asynchronous.mongo_client import AsyncMongoClient

from app.config import REPO_ROOT, get_settings
from app.db import create_client
from app.normalize import (
    EXPECTED_RECORD_COUNT,
    EXPECTED_SOURCE_SHA256,
    SOURCE_FIELDS,
    ValidationError,
    normalize_record,
    validate_dataset,
)

INSIGHTS_COLLECTION = "insights"
META_COLLECTION = "dataset_meta"
META_ID = "current"
IMPORT_VERSION = 1
NORMALIZATION_VERSION = 1
DEFAULT_SOURCE_PATH = REPO_ROOT / "data" / "raw" / "jsondata.json"

INDEXED_FIELDS = [
    "end_year",
    "topic",
    "sector",
    "region",
    "pestle",
    "source",
    "country",
    "start_year",
    "intensity",
    "likelihood",
    "relevance",
]


async def seed_database(
    client: AsyncMongoClient,
    db_name: str,
    source_path: Path,
    pinned_sha256: str | None = EXPECTED_SOURCE_SHA256,
) -> dict[str, Any]:
    """Validate, normalize, and idempotently import the source dataset.

    The insights collection is treated as the store for exactly one dataset version.
    Documents are upserted by deterministic id, then documents whose ids are not part
    of the validated source are deleted, so a re-seed or a validated new dataset
    version replaces the collection contents safely. Nothing is written before the
    complete dataset validates.
    """
    started = time.perf_counter()

    raw = source_path.read_bytes()
    dataset_sha256 = hashlib.sha256(raw).hexdigest()
    if pinned_sha256 is not None and dataset_sha256 != pinned_sha256:
        raise ValidationError(
            [
                f"source hash {dataset_sha256} does not match pinned hash {pinned_sha256}; "
                "refusing to import an unverified dataset version"
            ]
        )

    try:
        records: list[object] = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValidationError(
            [f"source is not valid JSON: {exc.msg} (line {exc.lineno}, column {exc.colno})"]
        ) from exc

    report = validate_dataset(records)
    if not report.ok:
        raise ValidationError(report.fatal_errors)

    documents = [
        normalize_record(dataset_sha256, index, record) for index, record in enumerate(records)
    ]

    database = client[db_name]
    insights = database[INSIGHTS_COLLECTION]

    for field in INDEXED_FIELDS:
        await insights.create_index(field, name=f"idx_{field}")

    await insights.bulk_write(
        [ReplaceOne({"_id": doc["_id"]}, doc, upsert=True) for doc in documents],
        ordered=False,
    )
    stale = await insights.delete_many({"_id": {"$nin": [doc["_id"] for doc in documents]}})

    final_count = await insights.count_documents({})
    if final_count != EXPECTED_RECORD_COUNT:
        raise ValidationError(
            [f"post-import document count {final_count} != expected {EXPECTED_RECORD_COUNT}"]
        )

    populated = {
        field_name: sum(1 for doc in documents if doc[field_name] is not None)
        for field_name in SOURCE_FIELDS
    }
    metadata = {
        "_id": META_ID,
        "source_filename": source_path.name,
        "source_sha256": dataset_sha256,
        "source_row_count": len(records),
        "document_count": final_count,
        "imported_at": datetime.now(UTC).isoformat(),
        "import_version": IMPORT_VERSION,
        "normalization_version": NORMALIZATION_VERSION,
        "schema": {
            "fields": sorted(SOURCE_FIELDS),
            "field_availability": {field: True for field in SOURCE_FIELDS}
            | {"city": False, "swot": False},
            "populated": populated,
        },
    }
    await database[META_COLLECTION].replace_one({"_id": META_ID}, metadata, upsert=True)

    return {
        "database": db_name,
        "collection": INSIGHTS_COLLECTION,
        "source_path": str(source_path),
        "source_sha256": dataset_sha256,
        "source_row_count": len(records),
        "documents_imported": final_count,
        "stale_documents_removed": stale.deleted_count,
        "indexes_ensured": len(INDEXED_FIELDS),
        "quality_notes": report.quality_notes,
        "elapsed_seconds": round(time.perf_counter() - started, 3),
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m app.seed",
        description="Validate and idempotently import the InsightScope source dataset "
        "into MongoDB.",
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE_PATH,
        help=f"path to the source JSON file (default: {DEFAULT_SOURCE_PATH})",
    )
    return parser


async def run(parser: argparse.ArgumentParser) -> int:
    args = parser.parse_args()
    settings = get_settings()
    client = create_client(settings)
    try:
        summary = await seed_database(client, settings.mongodb_db, args.source)
    except ValidationError as exc:
        print("SEED ABORTED — dataset validation failed:")
        for error in exc.errors:
            print(f"  - {error}")
        return 1
    finally:
        await client.close()

    print("SEED COMPLETE")
    for key in ("source_path", "source_sha256", "source_row_count", "documents_imported"):
        print(f"  {key}: {summary[key]}")
    print(f"  stale_documents_removed: {summary['stale_documents_removed']}")
    print(f"  indexes_ensured: {summary['indexes_ensured']}")
    print(f"  elapsed_seconds: {summary['elapsed_seconds']}")
    for note in summary["quality_notes"]:
        print(f"  note: {note}")
    return 0


def main() -> None:
    raise SystemExit(asyncio.run(run(build_parser())))


if __name__ == "__main__":
    main()
