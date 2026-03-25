"""Phase 2: AI enrichment — company context, narratives, impact estimates."""

from __future__ import annotations

import json
import logging
import re
import signal
from datetime import datetime, timezone

import anthropic

# ── Timeout helper ────────────────────────────────────────────────────────────
DOC_TIMEOUT_SECONDS = 300  # 5 minutes per document


class _EnrichmentTimeout(Exception):
    pass


def _timeout_handler(signum, frame):
    raise _EnrichmentTimeout("Enrichment timed out")

from pipeline.config import ANTHROPIC_API_KEY, ENRICHMENT_MODEL, MAX_SUMMARY_CHARS
from pipeline.db import get_conn
from pipeline.extraction.parser import parse_json_response
from pipeline.extraction.prompts import SYSTEM_PROMPT, PHASE2_PROMPT, PHASE2_VERSION

log = logging.getLogger(__name__)

# ── Text truncation utilities (from revise_what_why.py) ──────────────────────

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
        if _ABBREV.search(buf) or _SINGLE_CAP.search(last_word) or len(buf) < 20:
            continue
        sentences.append(buf)
        buf = ""
    if buf:
        sentences.append(buf)
    return sentences if sentences else [text]


def _strip_trailing_conjunction(text: str) -> str:
    """Remove trailing fragments that leave text incomplete."""
    for bad in (", and", ", or", ", but", " and", " or", " but"):
        while text.rstrip().endswith(bad):
            text = text.rstrip()[: -len(bad)].rstrip()
            if text.endswith(","):
                text = text[:-1].rstrip()
    for bad in (
        " user.", " approximately", " from", " to", " in", " on", " for",
        " with", " without", " by", " of", " regardless of", " user",
        " the", " a", " an",
    ):
        while text.rstrip().endswith(bad):
            text = text.rstrip()[: -len(bad)].rstrip()
            if text.endswith(","):
                text = text[:-1].rstrip()
    t = text.rstrip()
    if t and t[-1] not in ".?!":
        for sep in (" and ", ", ", ",' "):
            idx = t.rfind(sep)
            if idx > len(t) * 0.5:
                t = t[:idx].rstrip()
                if t.endswith(","):
                    t = t[:-1].rstrip()
                break
        if t and t[-1] not in ".?!":
            t = t + "."
    return t.strip()


def truncate_to_complete_summary(text: str, max_chars: int = MAX_SUMMARY_CHARS) -> str:
    """Keep complete sentences only, max max_chars. Never cut mid-sentence."""
    if not text or not (t := text.strip()):
        return ""
    if len(t) <= max_chars:
        return _strip_trailing_conjunction(t)
    sentences = _split_sentences(t)
    result = []
    for s in sentences:
        candidate = " ".join(result + [s]).strip()
        if len(candidate) <= max_chars:
            result.append(s)
        else:
            break
    if result:
        return _strip_trailing_conjunction(" ".join(result).strip())
    cut = t[:max_chars]
    last_space = cut.rfind(" ")
    out = cut[: last_space + 1].strip() if last_space > max_chars * 0.5 else cut.strip()
    return _strip_trailing_conjunction(out)


# ── Enrichment ───────────────────────────────────────────────────────────────


def enrich_document(document_id: int, phase1_data: dict, document_text: str) -> dict | None:
    """
    Run Phase 2 enrichment on a document using Phase 1 data + text.

    Returns enrichment data dict, or None on failure.
    """
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not set")

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    # Provide a text excerpt (not full doc) to save tokens
    excerpt = document_text[:15_000] if len(document_text) > 15_000 else document_text

    prompt = PHASE2_PROMPT.format(
        company=phase1_data.get("company") or "Unknown",
        jurisdiction=phase1_data.get("jurisdiction") or "Unknown",
        year=phase1_data.get("year") or "?",
        sector=phase1_data.get("sector") or "Unknown",
        summary=(phase1_data.get("summary") or "")[:500],
        penalty=phase1_data.get("penalty_total_display") or phase1_data.get("penalty_original") or "None",
        individuals=phase1_data.get("individuals_affected") or 0,
        outcome_summary=phase1_data.get("outcome_summary_short") or "",
        document_excerpt=excerpt,
    )

    started_at = datetime.now(timezone.utc)

    old_handler = signal.signal(signal.SIGALRM, _timeout_handler)
    signal.alarm(DOC_TIMEOUT_SECONDS)

    try:
        message = client.messages.create(
            model=ENRICHMENT_MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )

        signal.alarm(0)

        raw_response = message.content[0].text.strip()
        data = parse_json_response(raw_response)

        # Enforce 195-char truncation on narrative fields
        if data.get("what_they_did"):
            data["what_they_did"] = truncate_to_complete_summary(data["what_they_did"])
        if data.get("why_they_were_wrong"):
            data["why_they_were_wrong"] = truncate_to_complete_summary(data["why_they_were_wrong"])

        _save_extraction_run(
            document_id=document_id,
            phase="enrichment",
            model_used=ENRICHMENT_MODEL,
            prompt_version=PHASE2_VERSION,
            raw_response=raw_response,
            extracted_data=data,
            input_tokens=message.usage.input_tokens,
            output_tokens=message.usage.output_tokens,
            status="success",
            started_at=started_at,
        )

        log.info(f"Phase 2 enrichment for doc {document_id}: {phase1_data.get('company', '?')}")
        return data

    except _EnrichmentTimeout:
        signal.alarm(0)
        _save_extraction_run(
            document_id=document_id,
            phase="enrichment",
            model_used=ENRICHMENT_MODEL,
            prompt_version=PHASE2_VERSION,
            raw_response="",
            extracted_data={},
            status="error",
            error_message=f"Timed out after {DOC_TIMEOUT_SECONDS}s",
            started_at=started_at,
        )
        log.warning(f"Phase 2 SKIPPED doc {document_id}: timed out after {DOC_TIMEOUT_SECONDS}s")
        return None

    except (json.JSONDecodeError, anthropic.APIError) as e:
        signal.alarm(0)
        _save_extraction_run(
            document_id=document_id,
            phase="enrichment",
            model_used=ENRICHMENT_MODEL,
            prompt_version=PHASE2_VERSION,
            raw_response="",
            extracted_data={},
            status="error",
            error_message=str(e),
            started_at=started_at,
        )
        log.error(f"Phase 2 error for doc {document_id}: {e}")
        return None

    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old_handler)


def enrich_pending(jurisdiction_id: str | None = None, limit: int | None = None) -> int:
    """
    Run Phase 2 enrichment on all extracted documents that haven't been enriched yet.

    Returns count of documents enriched.
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            query = """
                SELECT dd.id, er.extracted_data, rd.extracted_text
                FROM discovered_documents dd
                JOIN extraction_runs er ON er.document_id = dd.id
                    AND er.phase = 'extraction' AND er.status = 'success'
                JOIN raw_documents rd ON rd.document_id = dd.id
                WHERE dd.status = 'extracted'
                  AND NOT EXISTS (
                      SELECT 1 FROM extraction_runs er2
                      WHERE er2.document_id = dd.id AND er2.phase = 'enrichment' AND er2.status = 'success'
                  )
            """
            params: list = []
            if jurisdiction_id:
                query += " AND dd.jurisdiction_id = %s"
                params.append(jurisdiction_id)
            query += " ORDER BY dd.id"
            if limit:
                query += " LIMIT %s"
                params.append(limit)
            cur.execute(query, params)
            rows = cur.fetchall()

    from tqdm import tqdm

    count = 0
    for doc_id, phase1_json, doc_text in tqdm(rows, desc="Phase 2 Enrich", unit="doc"):
        phase1_data = phase1_json if isinstance(phase1_json, dict) else json.loads(phase1_json)
        result = enrich_document(doc_id, phase1_data, doc_text or "")
        if result:
            _update_doc_status(doc_id, "enriched")
            count += 1

    return count


def _update_doc_status(document_id: int, status: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE discovered_documents SET status = %s WHERE id = %s",
                (status, document_id),
            )
        conn.commit()


def _save_extraction_run(
    document_id: int,
    phase: str,
    model_used: str,
    prompt_version: str,
    raw_response: str,
    extracted_data: dict,
    status: str = "success",
    error_message: str | None = None,
    input_tokens: int = 0,
    output_tokens: int = 0,
    started_at: datetime | None = None,
):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO extraction_runs
                   (document_id, phase, model_used, prompt_version,
                    raw_response, extracted_data, input_tokens, output_tokens,
                    status, error_message, started_at, completed_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())""",
                (
                    document_id,
                    phase,
                    model_used,
                    prompt_version,
                    json.dumps(raw_response) if raw_response else None,
                    json.dumps(extracted_data),
                    input_tokens,
                    output_tokens,
                    status,
                    error_message,
                    started_at,
                ),
            )
        conn.commit()
