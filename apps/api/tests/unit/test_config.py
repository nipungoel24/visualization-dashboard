import pytest
from pydantic import ValidationError as PydanticValidationError

from app.config import get_settings


@pytest.fixture(autouse=True)
def reset_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


class TestSettings:
    def test_missing_required_variables_fail_fast(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("MONGODB_URI", raising=False)
        monkeypatch.delenv("MONGODB_DB", raising=False)
        with pytest.raises(PydanticValidationError):
            get_settings()

    def test_required_variables_are_read(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("MONGODB_URI", "mongodb://example:27017")
        monkeypatch.setenv("MONGODB_DB", "test_db")
        settings = get_settings()
        assert settings.mongodb_uri == "mongodb://example:27017"
        assert settings.mongodb_db == "test_db"

    def test_allowed_origins_parses_comma_separated(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("MONGODB_URI", "mongodb://example:27017")
        monkeypatch.setenv("MONGODB_DB", "test_db")
        monkeypatch.setenv("ALLOWED_ORIGINS", "http://localhost:3000, https://example.com")
        assert get_settings().allowed_origins == [
            "http://localhost:3000",
            "https://example.com",
        ]

    def test_allowed_origins_defaults(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("MONGODB_URI", "mongodb://example:27017")
        monkeypatch.setenv("MONGODB_DB", "test_db")
        monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
        assert get_settings().allowed_origins == ["http://localhost:3000"]
