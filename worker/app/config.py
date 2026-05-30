from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    worker_api_key: str = "dev-worker-api-key"
    allowed_origins: str = "*"
    log_level: str = "info"
    temp_dir: str = "/tmp/edgeproof"
    certs_dir: str = "/app/certs"
    max_file_size_bytes: int = 500 * 1024 * 1024
    use_mock_results: bool = False
    sandbox_rlimit_as_bytes: int = 1024 * 1024 * 1024
    sandbox_rlimit_cpu_seconds_ffprobe: int = 20
    sandbox_rlimit_cpu_seconds_validator: int = 60
    sandbox_rlimit_fsize_bytes: int = 16 * 1024 * 1024
    sandbox_rlimit_nproc: int = 64
    sandbox_max_input_bytes: int = 500 * 1024 * 1024
    sandbox_allow_net: bool = False
    allow_degraded_sandbox: bool = False
    sandbox_max_output_bytes: int = 16 * 1024 * 1024
    sandbox_memory_limit_bytes: int = 1536 * 1024 * 1024
    sandbox_max_concurrent_jobs: int = 1

    class Config:
        env_prefix = ""


settings = Settings()
