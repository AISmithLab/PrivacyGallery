"""
Revise what_they_did, why_they_were_wrong, founding_year, and company_worth for all cases
=========================================================================================
Re-calls Claude to make these fields company-specific and fill gaps, then updates the database.
Uses PDF when available; otherwise uses case context (legal_findings, summary, etc.).

Usage:
    cd files
    python revise_what_why.py

Optional env:
    REVISE_LIMIT=N  - process only first N cases (for testing)
    REVISE_DRY=1     - don't write to DB, just print
"""

import base64
import json
import os
import re
from pathlib import Path

import anthropic
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

_AGENT_DIR = Path(__file__).resolve().parent
DONE_DIR = Path(os.getenv("DONE_DIR", str(_AGENT_DIR / "processed")))
DB_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/privacy_cases")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY")
MODEL = os.getenv("REVISE_MODEL", "claude-haiku-4-5")
REVISE_LIMIT = os.getenv("REVISE_LIMIT")
REVISE_DRY = os.getenv("REVISE_DRY", "").lower() in ("1", "true", "yes")
REVISE_CASE_IDS = os.getenv("REVISE_CASE_IDS")  # e.g. "640" or "1,7,640"

MIN_CONTENT_CHARS = 60  # Minimum for a real sentence — anything shorter is incomplete

REVISION_PROMPT_PDF = """You have a legal/regulatory document. The case involves {company} ({jurisdiction}, {year}).

CRITICAL RULES:
1. Each field MUST be a complete sentence ending in . or ? or ! Max 195 characters. Never truncate mid-sentence.
2. "why_they_were_wrong" MUST describe real-world harm or exposure caused by THIS company — NOT describe what a law says. NEVER write "Section X requires..." or "The Act prohibits...". Instead write what happened to real people: e.g. "390 million users' data was exposed to surveillance with no legal safeguards." or "Snapchat's false claims led 100M users to share intimate content believing it would disappear."
{short_content_warning}
Return ONLY a valid JSON object:
{{
  "what_they_did": "One complete sentence describing the company's action. Max 195 chars. Ends with period.",
  "why_they_were_wrong": "One complete sentence describing real harm or exposure to people — company-specific, no law quotes. Max 195 chars. Ends with period."
  {extra_keys}
}}

Current values (rewrite if they describe laws rather than company-specific harm, or if they are too short/incomplete):
- what_they_did: {current_what}
- why_they_were_wrong: {current_why}
"""

MAX_SUMMARY_CHARS = 195


_ABBREV = re.compile(
    r'\b(?:Inc|Ltd|Corp|Pte|Co|Jr|Sr|Dr|Mr|Mrs|Ms|Prof|St|LLC|LLP|GmbH|'
    r'S\.L|S\.A|S\.L\.U|B\.V|A\.E|N\.A|plc|'
    r'U\.S|E\.U|EU-U\.S|Swiss-U\.S|U\.K|approx|est|Dept|Gov|vs)\.$',
    re.IGNORECASE,
)
_SINGLE_CAP = re.compile(r'\b[A-Z]\.$')


def _split_sentences(text: str) -> list[str]:
    """Split into real sentences, merging back abbreviation fragments."""
    raw = re.split(r"(?<=[.!?])\s+", text)
    sentences: list[str] = []
    buf = ""
    for part in raw:
        buf = (buf + " " + part).strip() if buf else part
        last_word = buf.split()[-1] if buf else ""
        # Keep accumulating if buf looks like an abbreviation fragment
        if _ABBREV.search(buf) or _SINGLE_CAP.search(last_word) or len(buf) < 20:
            continue
        sentences.append(buf)
        buf = ""
    if buf:
        sentences.append(buf)
    return sentences if sentences else [text]


def truncate_to_complete_summary(text: str, max_chars: int = MAX_SUMMARY_CHARS) -> str:
    """Keep complete sentences only, max max_chars. Never cut mid-sentence."""
    if not text or not (t := text.strip()):
        return ""
    if len(t) <= max_chars:
        return t
    sentences = _split_sentences(t)
    result = []
    for s in sentences:
        candidate = " ".join(result + [s]).strip()
        if len(candidate) <= max_chars:
            result.append(s)
        else:
            break
    if result:
        out = " ".join(result).strip()
        return _strip_trailing_conjunction(out)
    # One long sentence: cut at last word boundary
    cut = t[:max_chars]
    last_space = cut.rfind(" ")
    out = cut[: last_space + 1].strip() if last_space > max_chars * 0.5 else cut.strip()
    return _strip_trailing_conjunction(out)


def _strip_trailing_conjunction(text: str) -> str:
    """Remove trailing ', and', ', or', ', but' etc. that leave text cut off mid-thought."""
    for bad in (", and", ", or", ", but", " and", " or", " but"):
        while text.rstrip().endswith(bad):
            text = text.rstrip()[:- len(bad)].rstrip()
            if text.endswith(","):
                text = text[:-1].rstrip()
    # Also strip incomplete trailing phrases (e.g. "from approximately", "regardless of user")
    for bad in (" user.", " approximately", " from", " to", " in", " on", " for", " with", " without", " by", " of", " regardless of", " user", " the", " a", " an"):
        while text.rstrip().endswith(bad):
            text = text.rstrip()[:- len(bad)].rstrip()
            if text.endswith(","):
                text = text[:-1].rstrip()
    # If still no sentence end, strip back to last complete clause (before " and " or ", ")
    t = text.rstrip()
    if t and t[-1] not in ".?!":
        for sep in (" and ", ", ", ",' "):
            idx = t.rfind(sep)
            if idx > len(t) * 0.5:  # Only if we keep substantial text
                t = t[:idx].rstrip()
                if t.endswith(","):
                    t = t[:-1].rstrip()
                break
        if t and t[-1] not in ".?!":
            t = t + "."
    return t.strip()


REVISION_PROMPT_TEXT = """You have case context for {company} ({jurisdiction}, {year}), sector: {sector}.

CRITICAL RULES:
1. Each field MUST be a complete sentence ending in . or ? or ! Max 195 characters. Never truncate mid-sentence.
2. "why_they_were_wrong" MUST describe real-world harm or exposure to people caused by THIS company — NOT describe what a law says. NEVER write "Section X requires..." or "The Act prohibits...". Instead write what happened: e.g. "390 million users' data was exposed to surveillance with no legal safeguards." or "Snapchat's false claims led millions to share intimate content believing it would disappear."
{short_content_warning}
Return ONLY a valid JSON object:
{{
  "what_they_did": "One complete sentence describing the company's action. Max 195 chars. Ends with period.",
  "why_they_were_wrong": "One complete sentence describing real harm or exposure — company-specific, no law quotes. Max 195 chars. Ends with period."
  {extra_keys}
}}

Case context:
- Summary: {summary}
- Legal findings: {legal_violations}
- Current what_they_did: {current_what}
- Current why_they_were_wrong: {current_why}
"""


def find_pdf(file_name: str) -> Path | None:
    if not file_name:
        return None
    for p in DONE_DIR.rglob("*.pdf"):
        if p.name == file_name:
            return p
    return None


def _extra_keys(need_founding: bool, need_worth: bool) -> str:
    parts = []
    if need_founding:
        parts.append(',\n  "founding_year": integer  // Year company was founded. Infer from document or public knowledge. Omit if unknown.')
    if need_worth:
        parts.append(',\n  "company_worth": "string"  // CRITICAL: Infer from public knowledge. Market cap, revenue, or valuation e.g. "$24B", "€500M". Use parent valuation for subsidiaries. "Unknown" only if truly obscure.')
    return "".join(parts)


def _short_content_warning(current_what: str, current_why: str) -> str:
    short_what = len((current_what or "").strip()) < MIN_CONTENT_CHARS
    short_why = len((current_why or "").strip()) < MIN_CONTENT_CHARS
    if not short_what and not short_why:
        return ""
    fields = []
    if short_what:
        fields.append("what_they_did")
    if short_why:
        fields.append("why_they_were_wrong")
    return f"\n⚠️  IMPORTANT: The current value(s) for {' and '.join(fields)} are too short or incomplete. You MUST provide a full, detailed sentence extracted from the document — not a fragment.\n"


def revise_with_pdf(pdf_path: Path, company: str, jurisdiction: str, year, sector: str,
                    current_what: str, current_why: str, need_founding: bool, need_worth: bool) -> dict:
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    with open(pdf_path, "rb") as f:
        pdf_b64 = base64.standard_b64encode(f.read()).decode("utf-8")

    prompt = REVISION_PROMPT_PDF.format(
        company=company or "the company",
        jurisdiction=jurisdiction or "unknown",
        year=year or "?",
        extra_keys=_extra_keys(need_founding, need_worth),
        short_content_warning=_short_content_warning(current_what, current_why),
        current_what=(current_what or "")[:500],
        current_why=(current_why or "")[:500],
    )

    message = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system="Return ONLY a valid JSON object — no markdown, no explanation.",
        messages=[{
            "role": "user",
            "content": [
                {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": pdf_b64}},
                {"type": "text", "text": prompt},
            ],
        }],
    )
    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(raw)


def revise_with_text(company: str, jurisdiction: str, year, sector: str, summary: str, legal_violations: str,
                    current_what: str, current_why: str, need_founding: bool, need_worth: bool) -> dict:
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    prompt = REVISION_PROMPT_TEXT.format(
        company=company or "the company",
        jurisdiction=jurisdiction or "unknown",
        year=year or "?",
        sector=sector or "unknown",
        summary=(summary or "")[:800],
        legal_violations=(legal_violations or "")[:1000],
        extra_keys=_extra_keys(need_founding, need_worth),
        short_content_warning=_short_content_warning(current_what, current_why),
        current_what=(current_what or "")[:500],
        current_why=(current_why or "")[:500],
    )

    message = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system="Return ONLY a valid JSON object — no markdown, no explanation.",
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(raw)


def main():
    if not ANTHROPIC_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not set")
    if not DB_URL:
        raise RuntimeError("DATABASE_URL not set")

    limit = int(REVISE_LIMIT) if REVISE_LIMIT and REVISE_LIMIT.isdigit() else None
    case_ids = None
    if REVISE_CASE_IDS:
        case_ids = [int(x.strip()) for x in REVISE_CASE_IDS.split(",") if x.strip().isdigit()]
    if REVISE_DRY:
        print("DRY RUN — no DB updates")

    conn = psycopg2.connect(DB_URL)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("SELECT id, file_name, raw_json FROM cases ORDER BY id")
            rows = cur.fetchall()

        if case_ids:
            rows = [r for r in rows if r["id"] in case_ids]
            print(f"Processing {len(rows)} case(s): {case_ids}")
        total = len(rows)
        if limit and not case_ids:
            rows = rows[:limit]
            print(f"Processing first {len(rows)} of {total} cases")
        else:
            print(f"Processing {total} cases")

        updated = 0
        for row in rows:
            rid = row["id"]
            file_name = row.get("file_name") or ""
            raw = row.get("raw_json")
            if isinstance(raw, str):
                try:
                    data = json.loads(raw)
                except Exception:
                    data = {}
            else:
                data = raw or {}

            company = data.get("company") or "?"
            current_what = data.get("what_they_did") or ""
            current_why = data.get("why_they_were_wrong") or ""
            jurisdiction = data.get("jurisdiction") or ""
            year = data.get("year") or "?"
            sector = data.get("sector") or ""
            summary = data.get("summary") or ""
            founding_year = data.get("founding_year") or 0
            try:
                founding_year = int(founding_year)
            except (TypeError, ValueError):
                founding_year = 0
            company_worth = (data.get("company_worth") or "").strip()
            need_founding = founding_year == 0
            need_worth = not company_worth or company_worth.lower() in ("unknown", "—", "-")

            legal_findings = data.get("legal_findings") or []
            legal_violations = []
            for lf in legal_findings:
                if isinstance(lf, dict):
                    vios = lf.get("violations") or []
                    legal_violations.extend(vios if isinstance(vios, list) else [str(vios)])
            legal_violations_str = "; ".join(str(v) for v in legal_violations[:5])

            try:
                pdf_path = find_pdf(file_name)
                if pdf_path:
                    result = revise_with_pdf(pdf_path, company, jurisdiction, year, sector,
                                            current_what, current_why, need_founding, need_worth)
                else:
                    result = revise_with_text(company, jurisdiction, year, sector, summary, legal_violations_str,
                                             current_what, current_why, need_founding, need_worth)

                new_what = truncate_to_complete_summary(result.get("what_they_did") or "")
                new_why = truncate_to_complete_summary(result.get("why_they_were_wrong") or "")
                new_founding = result.get("founding_year")
                new_worth = (result.get("company_worth") or "").strip()

                if new_what or new_why or (need_founding and new_founding) or (need_worth and new_worth):
                    if new_what:
                        data["what_they_did"] = new_what
                    if new_why:
                        data["why_they_were_wrong"] = new_why
                    if need_founding and new_founding is not None:
                        try:
                            data["founding_year"] = int(new_founding)
                        except (TypeError, ValueError):
                            pass
                    if need_worth and new_worth:
                        data["company_worth"] = new_worth

                    if not REVISE_DRY:
                        with conn.cursor() as cur:
                            cur.execute(
                                "UPDATE cases SET raw_json = %s WHERE id = %s",
                                (json.dumps(data), rid),
                            )
                        conn.commit()
                    updated += 1
                    if REVISE_DRY:
                        print(f"\n  [{rid}] {company}:")
                        print(f"    WHAT THEY DID (before): {current_what[:150]}..." if len(current_what) > 150 else f"    WHAT THEY DID (before): {current_what}")
                        print(f"    WHAT THEY DID (after):  {new_what}")
                        print(f"    WHY WRONG (before): {current_why[:150]}..." if len(current_why) > 150 else f"    WHY WRONG (before): {current_why}")
                        print(f"    WHY WRONG (after):  {new_why}")
                        if need_founding and new_founding:
                            print(f"    FOUNDING YEAR: {new_founding}")
                        if need_worth and new_worth:
                            print(f"    COMPANY WORTH: {new_worth}")
                    else:
                        print(f"  [{rid}] {company}: updated")
                else:
                    print(f"  [{rid}] {company}: no valid response, skipped")

            except json.JSONDecodeError as e:
                print(f"  [{rid}] {company}: JSON error — {e}")
            except anthropic.APIError as e:
                print(f"  [{rid}] {company}: API error — {e}")
            except Exception as e:
                print(f"  [{rid}] {company}: error — {e}")

        print(f"\nDone. Updated {updated} cases.")
        if updated and not REVISE_DRY:
            print("Run: python export_to_frontend.py  # to refresh src/data/generatedCases.json")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
