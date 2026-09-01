from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../../.env", extra="ignore")

    service_name: str = "vaic-report-generator"
    host: str = "0.0.0.0"
    port: int = 8005

    # LLM config
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-2.0-flash"
    anthropic_api_key: Optional[str] = None
    anthropic_model: str = "claude-sonnet-4-6"

    # Kafka
    kafka_brokers: str = "localhost:9092"
    kafka_group_id: str = "vaic-report-generator-group"

    # S3
    s3_reports_bucket: str = "vaic-reports-prod"
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_region: str = "us-east-1"

    # Slack
    enable_slack: bool = False
    slack_bot_token: Optional[str] = None
    slack_isr_channel: str = "#incident-reports"

    # Internal API
    api_base_url: str = "http://localhost:3001"
    internal_api_token: str = "internal-service-token"


settings = Settings()
