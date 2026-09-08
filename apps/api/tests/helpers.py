import json
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[3]
SOURCE_PATH = REPO_ROOT / "data" / "raw" / "jsondata.json"


def source_records() -> list[dict[str, Any]]:
    with SOURCE_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def normalize_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, str):
        stripped = value.strip()
        return stripped if stripped else None
    return value


def normalized_records() -> list[dict[str, Any]]:
    return [
        {key: normalize_value(value) for key, value in record.items()}
        for record in source_records()
    ]


def average(values: list[int | None]) -> float | None:
    present = [value for value in values if value is not None]
    if not present:
        return None
    return sum(present) / len(present)


def count_matching(predicate: Any) -> int:
    return sum(1 for record in normalized_records() if predicate(record))
