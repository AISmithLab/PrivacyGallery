"""Phase 1: Extract structured fields from document text using Claude."""

from __future__ import annotations

import json
import logging
import signal
from datetime import datetime, timezone

import anthropic

# ── Timeout helper ────────────────────────────────────────────────────────────
DOC_TIMEOUT_SECONDS = 300  # 5 minutes per document


class _ExtractionTimeout(Exception):
    pass


def _timeout_handler(signum, frame):
    raise _ExtractionTimeout("Extraction timed out")

from pipeline.config import ANTHROPIC_API_KEY, EXTRACTION_MODEL
from pipeline.db import get_conn, log_pipeline_event
from pipeline.extraction.parser import parse_json_response
from pipeline.extraction.prompts import SYSTEM_PROMPT, PHASE1_PROMPT, PHASE1_VERSION

log = logging.getLogger(__name__)


def extract_from_text(document_text: str, document_id: int) -> dict | None:
    """
    Run Phase 1 extraction on document text.

    Sends the text to Claude and saves the result to extraction_runs.
    Returns the extracted data dict, or None on failure.
    """
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not set")

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    # Truncate very long documents to fit context
    max_text_chars = 100_000
    text = document_text[:max_text_chars] if len(document_text) > max_text_chars else document_text

    prompt = PHASE1_PROMPT.format(document_text=text)

    started_at = datetime.now(timezone.utc)

    # Set a 5-minute alarm so we skip docs that hang
    old_handler = signal.signal(signal.SIGALRM, _timeout_handler)
    signal.alarm(DOC_TIMEOUT_SECONDS)

    try:
        message = client.messages.create(
            model=EXTRACTION_MODEL,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )

        signal.alarm(0)  # cancel alarm on success

        raw_response = message.content[0].text.strip()
        data = parse_json_response(raw_response)

        _save_extraction_run(
            document_id=document_id,
            phase="extraction",
            model_used=EXTRACTION_MODEL,
            prompt_version=PHASE1_VERSION,
            raw_response=raw_response,
            extracted_data=data,
            input_tokens=message.usage.input_tokens,
            output_tokens=message.usage.output_tokens,
            status="success",
            started_at=started_at,
        )

        log.info(
            f"Phase 1 extraction for doc {document_id}: "
            f"{data.get('company', '?')} | {data.get('jurisdiction', '?')}"
        )
        return data

    except _ExtractionTimeout:
        signal.alarm(0)
        _save_extraction_run(
            document_id=document_id,
            phase="extraction",
            model_used=EXTRACTION_MODEL,
            prompt_version=PHASE1_VERSION,
            raw_response="",
            extracted_data={},
            status="error",
            error_message=f"Timed out after {DOC_TIMEOUT_SECONDS}s",
            started_at=started_at,
        )
        log.warning(f"Phase 1 SKIPPED doc {document_id}: timed out after {DOC_TIMEOUT_SECONDS}s")
        return None

    except json.JSONDecodeError as e:
        signal.alarm(0)
        _save_extraction_run(
            document_id=document_id,
            phase="extraction",
            model_used=EXTRACTION_MODEL,
            prompt_version=PHASE1_VERSION,
            raw_response=raw_response if "raw_response" in dir() else "",
            extracted_data={},
            status="error",
            error_message=f"JSON parse error: {e}",
            started_at=started_at,
        )
        log.error(f"Phase 1 JSON parse error for doc {document_id}: {e}")
        return None

    except anthropic.APIError as e:
        signal.alarm(0)
        _save_extraction_run(
            document_id=document_id,
            phase="extraction",
            model_used=EXTRACTION_MODEL,
            prompt_version=PHASE1_VERSION,
            raw_response="",
            extracted_data={},
            status="error",
            error_message=f"API error: {e}",
            started_at=started_at,
        )
        log.error(f"Phase 1 API error for doc {document_id}: {e}")
        return None

    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old_handler)


def extract_pending(jurisdiction_id: str | None = None, limit: int | None = None) -> int:
    """
    Run Phase 1 extraction on all downloaded documents that haven't been extracted yet.

    Returns count of documents extracted.
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            query = """
                SELECT dd.id, rd.extracted_text
                FROM discovered_documents dd
                JOIN raw_documents rd ON rd.document_id = dd.id
                WHERE dd.status = 'downloaded'
                  AND rd.extracted_text IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM extraction_runs er
                      WHERE er.document_id = dd.id AND er.phase = 'extraction' AND er.status = 'success'
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
    for doc_id, extracted_text in tqdm(rows, desc="Phase 1 Extract", unit="doc"):
        result = extract_from_text(extracted_text, doc_id)
        if result:
            _update_doc_status(doc_id, "extracted")
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
