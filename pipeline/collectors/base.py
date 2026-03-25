"""Base class for jurisdiction-specific document collectors."""

from __future__ import annotations

from abc import ABC, abstractmethod

from pipeline.config import USER_AGENT
from pipeline.models import DiscoveredDoc


class BaseCollector(ABC):
    """
    Abstract base for jurisdiction collectors.

    Each subclass implements discover() to crawl a specific regulator's site
    and return all discoverable case documents. The pipeline handles dedup —
    collectors should return the full current list every time.
    """

    def __init__(self, jurisdiction_id: str, config: dict):
        self.jurisdiction_id = jurisdiction_id
        self.config = config  # from jurisdictions.config_json

    @abstractmethod
    def discover(self) -> list[DiscoveredDoc]:
        """
        Crawl the regulator's site and return discovered documents.

        Must be idempotent: returns the full list of known documents each time.
        Deduplication is handled downstream by the pipeline.
        """
        ...

    def get_headers(self) -> dict:
        """Default HTTP headers. Override for jurisdictions needing special headers."""
        return {"User-Agent": USER_AGENT}
