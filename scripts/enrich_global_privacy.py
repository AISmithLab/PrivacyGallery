"""
Use Claude to generate proper jurisdiction info for each country.
Reads globalJurisdictions.json, enriches with AI, writes back.

Usage:
    python3 scripts/enrich_global_privacy.py
"""

import json
import logging
import os
import time
from pathlib import Path

import anthropic
from dotenv import load_dotenv

_PROJECT_ROOT = Path(__file__).resolve().parents[1]
for _env in (_PROJECT_ROOT / "files" / ".env", _PROJECT_ROOT / ".env"):
    if _env.exists():
        load_dotenv(_env, override=True)
        break

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

DATA_PATH = Path(__file__).resolve().parents[1] / "src" / "data" / "globalJurisdictions.json"
API_KEY = os.getenv("ANTHROPIC_API_KEY")
MODEL = "claude-haiku-4-5"

PROMPT = """For the country "{name}", provide a concise privacy/data protection jurisdiction summary.

Return ONLY a valid JSON object with these fields:
{{
  "overview": "2-3 sentence overview of the country's data protection framework. What laws exist, when were they enacted, what do they cover? If no comprehensive law exists, say so.",
  "authority": "Name of the data protection authority/regulator and a 1-sentence description of their role. If none exists, say 'No dedicated data protection authority.'",
  "enforcementStyle": "1-2 sentences on how enforcement works — penalties, approach (strict vs lenient), notable actions. If limited enforcement, say so.",
  "mainLaws": ["Array of 1-3 main privacy/data protection laws with year, e.g. 'LGPD (2020)', 'PIPEDA (2000)'. Empty array if no specific law."]
}}

Be factual and concise. If a country has no data protection law, still provide useful context about the privacy landscape."""


def main():
    if not API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not set")

    client = anthropic.Anthropic(api_key=API_KEY)
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    log.info(f"Enriching {len(data)} countries...")

    enriched = 0
    for i, country in enumerate(data):
        name = country["name"]

        # Skip if already has good data (overview > 100 chars and doesn't start with navigation text)
        existing = country.get("overview", "")
        if (
            len(existing) > 100
            and not existing.startswith("Explore DLA")
            and not existing.startswith("Data protection laws in")
            and "Quick links" not in existing
        ):
            log.info(f"[{i+1}/{len(data)}] {name}: already enriched, skipping")
            continue

        log.info(f"[{i+1}/{len(data)}] Enriching {name}...")

        try:
            msg = client.messages.create(
                model=MODEL,
                max_tokens=512,
                system="Return ONLY a valid JSON object — no markdown, no explanation.",
                messages=[{"role": "user", "content": PROMPT.format(name=name)}],
            )
            raw = msg.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
            result = json.loads(raw)

            country["overview"] = result.get("overview", "")
            country["authority"] = result.get("authority", "")
            country["enforcementStyle"] = result.get("enforcementStyle", "")
            country["mainLaws"] = result.get("mainLaws", [])
            enriched += 1

        except Exception as e:
            log.warning(f"  {name}: failed — {e}")

        time.sleep(0.2)

    DATA_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    log.info(f"Done. Enriched {enriched}/{len(data)} countries. Saved to {DATA_PATH}")


if __name__ == "__main__":
    main()
