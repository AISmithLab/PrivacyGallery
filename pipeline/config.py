"""Pipeline configuration — loads from .env and environment variables."""

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from files/ directory (where existing scripts keep it)
_PIPELINE_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _PIPELINE_DIR.parent
_FILES_DIR = _PROJECT_ROOT / "files"

for env_path in (_FILES_DIR / ".env", _PROJECT_ROOT / ".env"):
    if env_path.exists():
        load_dotenv(env_path, override=True)
        break

# ── Paths ────────────────────────────────────────────────────────────────────

PROJECT_ROOT = _PROJECT_ROOT
PIPELINE_DIR = _PIPELINE_DIR
FILES_DIR = _FILES_DIR
FRONTEND_JSON_PATH = PROJECT_ROOT / "src" / "data" / "generatedCases.json"

# ── Database ─────────────────────────────────────────────────────────────────

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@localhost:5432/privacy_cases",
)

# ── Anthropic ────────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Phase 1 extraction: fast + cheap
EXTRACTION_MODEL = os.getenv("EXTRACTION_MODEL", "claude-haiku-4-5")

# Phase 2 enrichment: better narrative quality
ENRICHMENT_MODEL = os.getenv("ENRICHMENT_MODEL", "claude-haiku-4-5")

# ── Pipeline behaviour ───────────────────────────────────────────────────────

# Max documents to process per run (None = unlimited)
_max = os.getenv("MAX_DOCS")
MAX_DOCS: int | None = int(_max) if (_max and _max.isdigit()) else None

# HTTP request defaults
HTTP_TIMEOUT = 15
USER_AGENT = "Mozilla/5.0 (compatible; PrivacyGallery/2.0)"

# Text extraction
MAX_SUMMARY_CHARS = 195
