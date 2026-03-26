"""Data models for the pipeline."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class DiscoveredDoc:
    """A document found by a collector but not yet downloaded."""

    case_title: str
    source_page_url: str
    document_url: str
    file_type: str = "pdf"
    _oaic_summary: str | None = None  # Pre-built summary text (OAIC scrapes)


@dataclass
class Jurisdiction:
    """Row from the jurisdictions table."""

    id: str
    display_name: str
    country: str
    regulator: str
    base_url: str
    case_list_url: str | None = None
    document_types: list[str] = field(default_factory=lambda: ["pdf"])
    access_method: str = "direct"
    crawl_frequency: str = "weekly"
    enabled: bool = True
    config_json: dict = field(default_factory=dict)


@dataclass
class RawDocument:
    """A downloaded document with metadata."""

    id: int
    document_id: int
    file_name: str
    file_hash: str
    file_size: int | None = None
    mime_type: str = "application/pdf"
    extracted_text: str | None = None
    downloaded_at: datetime | None = None


@dataclass
class ExtractionResult:
    """Result of a Claude extraction or enrichment call."""

    document_id: int
    phase: str  # 'extraction' or 'enrichment'
    model_used: str
    prompt_version: str
    extracted_data: dict
    input_tokens: int = 0
    output_tokens: int = 0
    status: str = "success"
    error_message: str | None = None
