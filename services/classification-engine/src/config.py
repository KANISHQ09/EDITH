from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Classification Engine configuration.
    All values loaded from environment variables (or .env file).
    """

    model_config = SettingsConfigDict(env_file="../../.env", extra="ignore")

    # Service
    service_name: str = "vaic-classification-engine"
    host: str = "0.0.0.0"
    port: int = 8001
    log_level: str = "INFO"
    environment: str = "development"

    # AI Provider: 'gemini' | 'anthropic'
    llm_provider: str = "gemini"

    # Google Gemini
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"

    # Anthropic (Alternative)
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-4-6"

    classification_timeout_ms: int = 5000

    # Kafka
    kafka_brokers: str = "localhost:9092"
    kafka_group_id: str = "vaic-nce-group"
    kafka_client_id: str = "vaic-classification-engine"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Context window
    llm_context_window_size: int = 50
    unresolved_question_timeout_min: int = 5

    # Feature flags
    mock_llm_mode: bool = False


settings = Settings()
