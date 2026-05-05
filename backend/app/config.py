from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    environment: str = Field(default="development")
    secret_key: str = Field(default="dev-secret-do-not-use-in-prod")
    database_url: str = Field(
        default="postgresql+psycopg://flowops:flowops@localhost:5432/flowops",
    )
    git_sha: str = Field(default="dev")
    log_level: str = Field(default="INFO")
