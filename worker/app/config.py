from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    worker_api_key: str = "dev-worker-api-key"
    allowed_origins: str = "*"
    log_level: str = "info"
    temp_dir: str = "/tmp/edgeproof"
    certs_dir: str = "/app/certs"
    max_file_size_bytes: int = 50 * 1024 * 1024 * 1024  # 50 GB

    class Config:
        env_prefix = ""


settings = Settings()
