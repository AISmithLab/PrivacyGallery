"""Deduplication via SHA256 hash check against raw_documents."""

from __future__ import annotations

import hashlib
import logging

from pipeline.db import get_conn

log = logging.getLogger(__name__)


def sha256_bytes(data: bytes) -> str:
    """Compute SHA256 hash of raw bytes."""
    return hashlib.sha256(data).hexdigest()


def sha256_file(path) -> str:
    """Compute SHA256 hash of a file, reading in chunks."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def hash_exists(file_hash: str) -> bool:
    """Check if a document with this hash already exists in raw_documents."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM raw_documents WHERE file_hash = %s", (file_hash,))
            return cur.fetchone() is not None


def hash_exists_in_cases(file_hash: str) -> bool:
    """Check if a document with this hash exists in the legacy cases table."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM cases WHERE file_hash = %s", (file_hash,))
            return cur.fetchone() is not None
