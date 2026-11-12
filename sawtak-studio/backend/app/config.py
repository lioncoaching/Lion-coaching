"""Central settings. Every value can be overridden with an environment variable."""
from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # sawtak-studio/
DATA_DIR = Path(os.getenv("DATA_DIR", BASE_DIR / "data"))
FRONTEND_DIR = Path(os.getenv("FRONTEND_DIR", BASE_DIR / "frontend"))


def _bool(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    # Branding
    APP_NAME: str = os.getenv("APP_NAME", "Sawtak Studio")
    APP_NAME_AR: str = os.getenv("APP_NAME_AR", "صوتك ستوديو")
    PUBLIC_URL: str = os.getenv("PUBLIC_URL", "http://localhost:8000")

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
    ACCESS_TOKEN_HOURS: int = int(os.getenv("ACCESS_TOKEN_HOURS", "72"))
    ALLOW_SIGNUP: bool = _bool("ALLOW_SIGNUP", True)
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "")
    WHATSAPP_NUMBER: str = os.getenv("WHATSAPP_NUMBER", "")  # e.g. 2010xxxxxxx (no +)

    # Storage
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'sawtak.db'}")
    MAX_UPLOAD_MB: int = int(os.getenv("MAX_UPLOAD_MB", "50"))

    # Engines
    TTS_ENGINE: str = os.getenv("TTS_ENGINE", "elevenlabs")  # elevenlabs | cairo | mock
    LIPSYNC_ENGINE: str = os.getenv("LIPSYNC_ENGINE", "mux")  # wav2lip | latentsync | mux
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    ELEVENLABS_MODEL: str = os.getenv("ELEVENLABS_MODEL", "eleven_multilingual_v2")
    CAIRO_DEVICE: str = os.getenv("CAIRO_DEVICE", "auto")
    WAV2LIP_DIR: str = os.getenv("WAV2LIP_DIR", "")
    WAV2LIP_CHECKPOINT: str = os.getenv("WAV2LIP_CHECKPOINT", "")
    LATENTSYNC_DIR: str = os.getenv("LATENTSYNC_DIR", "")
    FFMPEG_BIN: str = os.getenv("FFMPEG_BIN", "ffmpeg")

    # Credits / pricing (1 credit = unit of work; plans define monthly allowances)
    CREDITS_PER_1000_CHARS: int = int(os.getenv("CREDITS_PER_1000_CHARS", "10"))
    CREDITS_PER_VIDEO_SECOND: int = int(os.getenv("CREDITS_PER_VIDEO_SECOND", "2"))
    CREDITS_PER_VOICE_CLONE: int = int(os.getenv("CREDITS_PER_VOICE_CLONE", "50"))
    WORKER_THREADS: int = int(os.getenv("WORKER_THREADS", "1"))


settings = Settings()

PLANS = {
    "free": {"name": "مجاني", "name_en": "Free", "monthly_credits": 200, "price_egp": 0,
             "max_voices": 1, "max_video_seconds": 15, "watermark": True},
    "creator": {"name": "صانع محتوى", "name_en": "Creator", "monthly_credits": 3000, "price_egp": 299,
                "max_voices": 3, "max_video_seconds": 60, "watermark": False},
    "pro": {"name": "برو", "name_en": "Pro", "monthly_credits": 12000, "price_egp": 899,
            "max_voices": 10, "max_video_seconds": 180, "watermark": False},
    "agency": {"name": "وكالة", "name_en": "Agency", "monthly_credits": 50000, "price_egp": 2999,
               "max_voices": 50, "max_video_seconds": 600, "watermark": False},
}
