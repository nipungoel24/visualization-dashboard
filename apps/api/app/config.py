from functools import lru_cache
from pathlib import Path
from typing import Annotated

from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


def _load_env_files() -> None:
    for candidate in (REPO_ROOT / ".env", Path.cwd() / ".env"):
        if candidate.is_file():
            load_dotenv(candidate)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)

    mongodb_uri: str
    mongodb_db: str
    allowed_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000"]
    mongodb_server_selection_timeout_ms: int = 3000

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    _load_env_files()
    return Settings()
