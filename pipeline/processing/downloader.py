"""Download documents and store as BLOBs in raw_documents."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from urllib.parse import urlparse, unquote

import requests

from pipeline.config import HTTP_TIMEOUT, USER_AGENT
from pipeline.db import get_conn, log_pipeline_event
from pipeline.processing.dedup import sha256_bytes, hash_exists

log = logging.getLogger(__name__)


def _filename_from_url(url: str) -> str:
    """Extract filename from URL path."""
    path = urlparse(url).path
    name = path.split("/")[-1] if path else ""
    return unquote(name).strip() or "document"


def _mime_from_url(url: str) -> str:
    """Guess MIME type from URL."""
    lower = url.lower()
    if lower.endswith(".pdf"):
        return "application/pdf"
    if lower.endswith(".html") or lower.endswith(".htm"):
        return "text/html"
    return "application/octet-stream"


def download_document(document_id: int, document_url: str, jurisdiction_id: str) -> int | None:
    """
    Download a document and store it in raw_documents.

    Returns the raw_documents.id on success, None on failure.
    Skips if the content hash already exists (dedup).
    """
    try:
        resp = requests.get(
            document_url,
            headers={"User-Agent": USER_AGENT},
            timeout=HTTP_TIMEOUT,
            allow_redirects=True,
        )
        resp.raise_for_status()
    except requests.RequestException as e:
        log.error(f"Download failed for doc {document_id}: {e}")
        _mark_error(document_id, f"Download failed: {e}")
        log_pipeline_event("download", "error", str(e), jurisdiction_id)
        return None

    content = resp.content
    file_hash = sha256_bytes(content)

    # Dedup: skip if we already have this exact file
    if hash_exists(file_hash):
        log.info(f"Duplicate content (hash={file_hash[:12]}...) for doc {document_id}, skipping")
        _update_status(document_id, "downloaded", file_hash)
        return None

    file_name = _filename_from_url(document_url)
    mime_type = resp.headers.get("Content-Type", _mime_from_url(document_url)).split(";")[0].strip()

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO raw_documents
                   (document_id, file_name, file_hash, file_data, file_size, mime_type)
                   VALUES (%s, %s, %s, %s, %s, %s)
                   ON CONFLICT (file_hash) DO NOTHING
                   RETURNING id""",
                (document_id, file_name, file_hash, content, len(content), mime_type),
            )
            row = cur.fetchone()
            raw_id = row[0] if row else None

            # Update discovered_documents status
            cur.execute(
                """UPDATE discovered_documents
                   SET status = 'downloaded', document_hash = %s, downloaded_at = NOW()
                   WHERE id = %s""",
                (file_hash, document_id),
            )
        conn.commit()

    if raw_id:
        log.info(f"Downloaded doc {document_id}: {file_name} ({len(content)} bytes)")
    return raw_id


def download_pending(jurisdiction_id: str | None = None, limit: int | None = None) -> int:
    """
    Download all documents in 'discovered' status.

    Returns number of documents downloaded.
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            query = "SELECT id, document_url, jurisdiction_id FROM discovered_documents WHERE status = 'discovered'"
            params: list = []
            if jurisdiction_id:
                query += " AND jurisdiction_id = %s"
                params.append(jurisdiction_id)
            query += " ORDER BY discovered_at"
            if limit:
                query += " LIMIT %s"
                params.append(limit)
            cur.execute(query, params)
            rows = cur.fetchall()

    downloaded = 0
    for doc_id, doc_url, jid in rows:
        result = download_document(doc_id, doc_url, jid)
        if result is not None:
            downloaded += 1

    return downloaded


def _mark_error(document_id: int, message: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE discovered_documents SET status = 'error', error_message = %s WHERE id = %s",
                (message[:500], document_id),
            )
        conn.commit()


def _update_status(document_id: int, status: str, file_hash: str | None = None):
    with get_conn() as conn:
        with conn.cursor() as cur:
            if file_hash:
                cur.execute(
                    "UPDATE discovered_documents SET status = %s, document_hash = %s, downloaded_at = NOW() WHERE id = %s",
                    (status, file_hash, document_id),
                )
            else:
                cur.execute(
                    "UPDATE discovered_documents SET status = %s WHERE id = %s",
                    (status, document_id),
                )
        conn.commit()
