"""Parse Claude JSON responses — handles markdown fences and common issues."""

from __future__ import annotations

import json
import logging
import re

log = logging.getLogger(__name__)


def parse_json_response(raw: str) -> dict:
    """
    Parse a JSON response from Claude, stripping markdown fences if present.

    Raises json.JSONDecodeError if the response is not valid JSON.
    """
    text = raw.strip()

    # Strip markdown code fences (```json ... ``` or ``` ... ```)
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        text = text.rsplit("```", 1)[0]
        text = text.strip()

    return json.loads(text)


def safe_parse(raw: str) -> dict | None:
    """Parse JSON response, returning None on failure instead of raising."""
    try:
        return parse_json_response(raw)
    except (json.JSONDecodeError, IndexError, ValueError) as e:
        log.error(f"JSON parse failed: {e}")
        return None
