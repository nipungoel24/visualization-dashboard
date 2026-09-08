import json

from app.config import REPO_ROOT
from app.normalize import (
    CATEGORICAL_FIELDS,
    NUMERIC_FIELDS,
    SOURCE_FIELDS,
    ValidationError,
    compute_identity,
    normalize_record,
    validate_dataset,
)

SHA_A = "a" * 64
SHA_B = "b" * 64


def make_record(**overrides: object) -> dict[str, object]:
    record: dict[str, object] = {
        "end_year": 2020,
        "intensity": 12,
        "sector": "Energy",
        "topic": "oil",
        "insight": "An insight",
        "url": "https://example.com/a",
        "region": "World",
        "start_year": 2019,
        "impact": 3,
        "added": "January, 20 2017 03:51:25",
        "published": "January, 20 2017 00:00:00",
        "country": "India",
        "relevance": 4,
        "pestle": "Economic",
        "source": "OPEC",
        "title": "A title",
        "likelihood": 3,
    }
    record.update(overrides)
    return record


def make_records(count: int) -> list[dict[str, object]]:
    return [
        make_record(title=f"Title {index}", url=f"https://example.com/{index}")
        for index in range(count)
    ]


def dataset_with(**overrides: object) -> list[dict[str, object]]:
    records = make_records(1000)
    for key, value in overrides.items():
        records[0][key] = value
    return records


def dataset_without(field_name: str) -> list[dict[str, object]]:
    records = make_records(1000)
    del records[0][field_name]
    return records


def load_real_records() -> list[object]:
    with (REPO_ROOT / "data" / "raw" / "jsondata.json").open(encoding="utf-8") as handle:
        return json.load(handle)


class TestComputeIdentity:
    def test_same_sha_and_row_produce_same_id(self) -> None:
        assert compute_identity(SHA_A, 0) == compute_identity(SHA_A, 0)

    def test_different_row_produces_different_id(self) -> None:
        assert compute_identity(SHA_A, 0) != compute_identity(SHA_A, 1)

    def test_different_dataset_sha_produces_different_id(self) -> None:
        assert compute_identity(SHA_A, 0) != compute_identity(SHA_B, 0)

    def test_id_is_stable_hex_digest(self) -> None:
        assert len(compute_identity(SHA_A, 7)) == 64
        int(compute_identity(SHA_A, 7), 16)


class TestValidateDataset:
    def test_real_dataset_passes(self) -> None:
        report = validate_dataset(load_real_records())
        assert report.ok
        assert report.fatal_errors == []
        assert any("city and swot" in note for note in report.quality_notes)

    def test_non_list_root_fails(self) -> None:
        report = validate_dataset({"data": []})  # type: ignore[arg-type]
        assert not report.ok
        assert "JSON array" in report.fatal_errors[0]

    def test_wrong_record_count_fails(self) -> None:
        report = validate_dataset(make_records(3))
        assert not report.ok
        assert any("found 3" in error for error in report.fatal_errors)

    def test_unexpected_key_fails(self) -> None:
        report = validate_dataset(dataset_with(city="Mumbai"))
        assert not report.ok
        assert any("unexpected=" in error and "city" in error for error in report.fatal_errors)

    def test_missing_key_fails(self) -> None:
        report = validate_dataset(dataset_without("country"))
        assert not report.ok
        assert any("missing=" in error and "country" in error for error in report.fatal_errors)

    def test_non_blank_string_in_numeric_field_fails(self) -> None:
        report = validate_dataset(dataset_with(intensity="12"))
        assert not report.ok
        assert any("intensity" in error for error in report.fatal_errors)

    def test_blank_string_in_numeric_field_is_ok(self) -> None:
        assert validate_dataset(dataset_with(intensity="")).ok

    def test_boolean_in_numeric_field_fails(self) -> None:
        assert not validate_dataset(dataset_with(likelihood=True)).ok

    def test_non_string_categorical_fails(self) -> None:
        report = validate_dataset(dataset_with(topic=7))
        assert not report.ok
        assert any("topic" in error for error in report.fatal_errors)

    def test_invalid_record_shape_fails(self) -> None:
        records = make_records(1000)
        records[1] = "not-a-record"  # type: ignore[list-item]
        report = validate_dataset(records)
        assert not report.ok
        assert any("record[1]" in error for error in report.fatal_errors)


class TestNormalizeRecord:
    def test_blank_strings_become_null(self) -> None:
        document = normalize_record(SHA_A, 0, make_record(country="", end_year="", sector=""))
        assert document["country"] is None
        assert document["end_year"] is None
        assert document["sector"] is None

    def test_whitespace_is_trimmed(self) -> None:
        document = normalize_record(SHA_A, 0, make_record(source="  CNBC  ", topic=" oil "))
        assert document["source"] == "CNBC"
        assert document["topic"] == "oil"

    def test_int_values_are_preserved(self) -> None:
        document = normalize_record(SHA_A, 0, make_record(intensity=96, likelihood=1, relevance=7))
        assert document["intensity"] == 96
        assert document["likelihood"] == 1
        assert document["relevance"] == 7

    def test_extreme_years_are_preserved(self) -> None:
        document = normalize_record(SHA_A, 0, make_record(end_year=2200, start_year=2050))
        assert document["end_year"] == 2200
        assert document["start_year"] == 2050

    def test_world_and_world_casing_preserved(self) -> None:
        upper = normalize_record(SHA_A, 0, make_record(region="World"))
        lower = normalize_record(SHA_A, 1, make_record(region="world"))
        assert upper["region"] == "World"
        assert lower["region"] == "world"

    def test_city_and_swot_are_not_invented(self) -> None:
        document = normalize_record(SHA_A, 0, make_record())
        assert "city" not in document
        assert "swot" not in document
        assert set(document.keys()) == set(SOURCE_FIELDS) | {
            "_id",
            "source_row_index",
            "source_dataset_sha256",
        }

    def test_row_identity_fields_are_stored(self) -> None:
        document = normalize_record(SHA_A, 42, make_record())
        assert document["_id"] == compute_identity(SHA_A, 42)
        assert document["source_row_index"] == 42
        assert document["source_dataset_sha256"] == SHA_A

    def test_null_values_are_preserved_as_null(self) -> None:
        document = normalize_record(SHA_A, 0, make_record(country=None))
        assert document["country"] is None

    def test_schema_fields_are_complete(self) -> None:
        document = normalize_record(SHA_A, 0, make_record())
        assert NUMERIC_FIELDS | CATEGORICAL_FIELDS == SOURCE_FIELDS
        for field in SOURCE_FIELDS:
            assert field in document


def test_validation_error_carries_errors() -> None:
    error = ValidationError(["first", "second"])
    assert error.errors == ["first", "second"]
    assert "first" in str(error)
