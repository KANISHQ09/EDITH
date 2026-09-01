from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    service_name: str = "vaic-transcription-engine"
    host: str = "0.0.0.0"
    port: int = 8002
    environment: str = "development"
    log_level: str = "INFO"

    # Kafka
    kafka_brokers: str = "localhost:9092"
    kafka_group_id: str = "vaic-tde-group"
    kafka_client_id: str = "vaic-transcription-engine"

    # Whisper
    whisper_model: str = "large-v3"   # tiny | base | small | medium | large-v3
    whisper_device: str = "cpu"        # cpu | cuda
    whisper_compute_type: str = "int8" # int8 (cpu) | float16 (gpu) | int8_float16 (gpu fast)
    whisper_language: str = "en"       # Force English for speed; set to None for auto-detect
    whisper_beam_size: int = 5
    whisper_vad_filter: bool = True    # Use built-in Whisper VAD to skip silence

    # Pyannote diarization
    pyannote_model: str = "pyannote/speaker-diarization-3.1"
    hf_token: str = ""                 # HuggingFace token for pyannote model download
    diarization_min_speakers: int = 1
    diarization_max_speakers: int = 12

    # Audio processing
    sample_rate: int = 16000
    chunk_duration_ms: int = 500
    # Accumulate chunks before transcribing (better accuracy with longer context)
    # 10 chunks = 5 seconds of audio per Whisper call
    accumulate_chunks: int = 10

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Speaker identity mapping TTL (seconds)
    speaker_map_ttl_s: int = 86400

    class Config:
        env_file = "../../.env"
        extra = "ignore"


settings = Settings()
