import hashlib
from dataclasses import dataclass
from dataclasses import field as dc_field

EXPECTED_SOURCE_SHA256 = "f45b67f7d4a252c5daa3ec0dfd9c7ceb4e415106c404646f66bff93d9aeb1744"
EXPECTED_RECORD_COUNT = 1000

SOURCE_FIELDS: frozenset[str] = frozenset(
    {
        "end_year",
        "intensity",
        "sector",
        "topic",
        "insight",
        "url",
        "region",
        "start_year",
        "impact",
        "added",
        "published",
        "country",
        "relevance",
        "pestle",
        "source",
        "title",
        "likelihood",
    }
)

CATEGORICAL_FIELDS: frozenset[str] = frozenset(
    {
        "added",
        "country",
        "insight",
        "pestle",
        "published",
        "region",
        "sector",
        "source",
        "title",
        "topic",
        "url",
    }
)

NUMERIC_FIELDS: frozenset[str] = frozenset(
    {"end_year", "impact", "intensity", "likelihood", "relevance", "start_year"}
)


class ValidationError(Exception):
    def __init__(self, errors: list[str]) -> None:
        super().__init__(
            "dataset validation failed:\n" + "\n".join(f" - {error}" for error in errors)
        )
        self.errors = errors


@dataclass
class ValidationReport:
    fatal_errors: list[str] = dc_field(default_factory=list)
    quality_notes: list[str] = dc_field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.fatal_errors


def compute_identity(dataset_sha256: str, row_index: int) -> str:
    return hashlib.sha256(f"{dataset_sha256}:{row_index}".encode()).hexdigest()


def validate_dataset(records: list[object]) -> ValidationReport:
    report = ValidationReport()

    if not isinstance(records, list):
        report.fatal_errors.append("root must be a JSON array")
        return report

    if len(records) != EXPECTED_RECORD_COUNT:
        report.fatal_errors.append(
            f"expected {EXPECTED_RECORD_COUNT} records, found {len(records)}"
        )

    blanks: dict[str, int] = {field: 0 for field in SOURCE_FIELDS}
    trimmed_count = 0
    world_pair = set()

    for index, record in enumerate(records):
        location = f"record[{index}]"
        if not isinstance(record, dict):
            report.fatal_errors.append(f"{location} is not a JSON object")
            continue
        keys = set(record.keys())
        if keys != set(SOURCE_FIELDS):
            unexpected = sorted(keys - set(SOURCE_FIELDS))
            missing = sorted(set(SOURCE_FIELDS) - keys)
            report.fatal_errors.append(
                f"{location} keys do not match the expected 17-field schema "
                f"(missing={missing}, unexpected={unexpected})"
            )
        for field_name in NUMERIC_FIELDS:
            value = record.get(field_name)
            if isinstance(value, bool):
                report.fatal_errors.append(
                    f"{location}.{field_name} is a boolean, expected int or blank"
                )
            elif not (
                value is None
                or isinstance(value, int)
                or (isinstance(value, str) and value.strip() == "")
            ):
                report.fatal_errors.append(
                    f"{location}.{field_name} has unexpected type {type(value).__name__}, "
                    "expected int or blank string"
                )
        for field_name in CATEGORICAL_FIELDS:
            value = record.get(field_name)
            if value is not None and not isinstance(value, str):
                report.fatal_errors.append(
                    f"{location}.{field_name} has unexpected type {type(value).__name__}, "
                    "expected string"
                )
        for field, value in record.items():
            if isinstance(value, str):
                if value.strip() == "":
                    blanks[field] = blanks.get(field, 0) + 1
                elif value != value.strip():
                    trimmed_count += 1
        if record.get("region") in {"World", "world"}:
            world_pair.add(record["region"])

    for field_name, count in blanks.items():
        if count:
            report.quality_notes.append(
                f"{field_name}: {count} blank ({count / EXPECTED_RECORD_COUNT:.1%})"
            )
    if trimmed_count:
        report.quality_notes.append(
            f"{trimmed_count} string values had leading/trailing whitespace (trimmed)"
        )
    if len(world_pair) == 2:
        report.quality_notes.append(
            "region contains both 'World' and 'world' as distinct supplied values (preserved)"
        )
    report.quality_notes.append(
        "city and swot fields are absent from the source schema (not manufactured)"
    )

    return report


def normalize_record(
    dataset_sha256: str, row_index: int, record: dict[str, object]
) -> dict[str, object]:
    document: dict[str, object] = {
        "_id": compute_identity(dataset_sha256, row_index),
        "source_row_index": row_index,
        "source_dataset_sha256": dataset_sha256,
    }
    for field_name in SOURCE_FIELDS:
        value = record[field_name]
        if value is None:
            document[field_name] = None
        elif isinstance(value, str):
            stripped = value.strip()
            document[field_name] = stripped if stripped else None
        else:
            document[field_name] = value
    return document
