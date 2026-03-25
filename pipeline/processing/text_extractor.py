"""
Text extraction from raw documents — PDF to text, HTML to text.

Uses pymupdf (PyMuPDF/fitz) as the primary PDF text extractor.
Falls back to pdfplumber for table-heavy documents.
Uses BeautifulSoup for HTML.
"""

from __future__ import annotations

import io
import logging

from pipeline.db import get_conn

log = logging.getLogger(__name__)


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from PDF bytes using pymupdf, with pdfplumber fallback."""
    text = _extract_with_pymupdf(pdf_bytes)
    if text and len(text.strip()) > 100:
        return text.strip()

    # Fallback: pdfplumber handles some table-heavy PDFs better
    log.info("pymupdf extracted little text, trying pdfplumber fallback")
    fallback = _extract_with_pdfplumber(pdf_bytes)
    if fallback and len(fallback.strip()) > len(text.strip()):
        return fallback.strip()

    return text.strip()


def _extract_with_pymupdf(pdf_bytes: bytes) -> str:
    """Extract text using PyMuPDF (fitz)."""
    try:
        import fitz  # pymupdf
    except ImportError:
        log.warning("pymupdf not installed — pip install pymupdf")
        return ""

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages = []
        for page in doc:
            pages.append(page.get_text())
        doc.close()
        return "\n\n".join(pages)
    except Exception as e:
        log.error(f"pymupdf extraction failed: {e}")
        return ""


def _extract_with_pdfplumber(pdf_bytes: bytes) -> str:
    """Extract text using pdfplumber (better for tables)."""
    try:
        import pdfplumber
    except ImportError:
        log.warning("pdfplumber not installed — pip install pdfplumber")
        return ""

    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            pages = []
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
            return "\n\n".join(pages)
    except Exception as e:
        log.error(f"pdfplumber extraction failed: {e}")
        return ""


def extract_text_from_html(html_bytes: bytes, encoding: str = "utf-8") -> str:
    """Extract clean text from HTML using BeautifulSoup."""
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        log.warning("beautifulsoup4 not installed — pip install beautifulsoup4")
        return html_bytes.decode(encoding, errors="replace")

    try:
        soup = BeautifulSoup(html_bytes.decode(encoding, errors="replace"), "lxml")

        # Remove script, style, nav, footer elements
        for tag in soup.select("script, style, nav, footer, header, aside"):
            tag.decompose()

        # Get text from main content area if available
        main = soup.select_one("main, article, .content, #content, .decision-body")
        if main:
            return main.get_text(separator="\n", strip=True)

        return soup.get_text(separator="\n", strip=True)
    except Exception as e:
        log.error(f"HTML text extraction failed: {e}")
        return html_bytes.decode(encoding, errors="replace")


def extract_text(file_data: bytes, mime_type: str) -> str:
    """Route to the correct extractor based on MIME type."""
    if "pdf" in mime_type:
        return extract_text_from_pdf(file_data)
    if "html" in mime_type or "text" in mime_type:
        return extract_text_from_html(file_data)
    # Unknown format: try as text
    try:
        return file_data.decode("utf-8", errors="replace")
    except Exception:
        return ""


def extract_text_for_document(raw_document_id: int) -> str | None:
    """
    Extract text for a raw_documents row and store it in extracted_text.

    Returns the extracted text, or None on failure.
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT file_data, mime_type FROM raw_documents WHERE id = %s",
                (raw_document_id,),
            )
            row = cur.fetchone()
            if not row:
                log.error(f"raw_document {raw_document_id} not found")
                return None

            file_data = bytes(row[0])
            mime_type = row[1] or "application/pdf"

    text = extract_text(file_data, mime_type)

    # Strip NUL bytes that some PDFs produce — PostgreSQL text columns reject them
    if text:
        text = text.replace("\x00", "")

    if text:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE raw_documents SET extracted_text = %s WHERE id = %s",
                    (text, raw_document_id),
                )
            conn.commit()
        log.info(f"Extracted {len(text)} chars for raw_document {raw_document_id}")

    return text


def extract_text_pending(limit: int | None = None) -> int:
    """Extract text for all raw_documents that don't have extracted_text yet."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            query = "SELECT id FROM raw_documents WHERE extracted_text IS NULL ORDER BY id"
            if limit:
                query += f" LIMIT {limit}"
            cur.execute(query)
            rows = cur.fetchall()

    count = 0
    for (raw_id,) in rows:
        result = extract_text_for_document(raw_id)
        if result:
            count += 1

    return count
