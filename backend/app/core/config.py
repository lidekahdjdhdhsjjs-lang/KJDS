from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field(default="Shopee AI Ops MVP")
    app_env: str = Field(default="development")
    app_debug: bool = Field(default=True)
    api_prefix: str = Field(default="/api/v1")
    app_base_url: str = Field(default="http://localhost:8000")
    frontend_base_url: str = Field(default="http://localhost:3000")
    postgres_dsn: str = Field(default="")
    sqlite_path: str = Field(default="dev.db")
    redis_url: str = Field(default="redis://localhost:6379/0")
    next_public_api_base: str = Field(default="http://localhost:8000/api/v1")
    platform_auth_state_secret: str = Field(default="")

    # Security settings
    cors_origins: str = Field(default="http://localhost:3000")
    rate_limit_requests: int = Field(default=100)
    rate_limit_window_seconds: int = Field(default=60)
    max_request_body_size: int = Field(default=10485760)  # 10MB
    session_secret_key: str = Field(default="change-me-in-production")
    api_key: str = Field(default="")

    # Shopee OAuth settings
    shopee_client_id: str = Field(default="")
    shopee_client_secret: str = Field(default="")
    shopee_auth_url: str = Field(default="https://partner.shopeemobile.com/api/v2/oauth/authorize")
    shopee_redirect_uri: str = Field(default="http://localhost:8000/api/v1/platform-connections/shopee/callback")
    shopee_api_base: str = Field(default="https://partner.shopeemobile.com/api/v1")

    # 1688 OAuth settings
    alibaba_client_id: str = Field(default="")
    alibaba_client_secret: str = Field(default="")
    alibaba_auth_url: str = Field(default="https://gw.open.1688.com/openapi/param2/1/system.oauthCode")
    alibaba_redirect_uri: str = Field(default="http://localhost:8000/api/v1/platform-connections/1688/callback")
    alibaba_api_base: str = Field(default="https://gw.open.1688.com/openapi")
    alibaba_cookie: str = Field(default="")
    shopee_authorized: bool = Field(default=False)
    alibaba_authorized: bool = Field(default=False)

    @property
    def allow_header_auth(self) -> bool:
        return self.app_env in {"development", "test"}

    @property
    def sqlalchemy_database_uri(self) -> str:
        if self.app_env == "test":
            return "sqlite+pysqlite:///:memory:"
        if self.postgres_dsn:
            return self.postgres_dsn
        return f"sqlite+pysqlite:///{self.sqlite_path}"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
