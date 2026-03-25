"""EU GDPR collector — aggregates enforcement actions from GDPRHub / enforcement tracker."""

from __future__ import annotations

import logging

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from pipeline.collectors.base import BaseCollector
from pipeline.config import HTTP_TIMEOUT
from pipeline.models import DiscoveredDoc

log = logging.getLogger(__name__)

# GDPRHub wiki has a comprehensive list of DPA decisions
_GDPRHUB_URL = "https://gdprhub.eu/index.php?title=Special:Ask"


class GDPRCollector(BaseCollector):
    """
    Discover EU GDPR enforcement decisions.

    Uses GDPRHub as an aggregation source across national DPAs (CNIL, AEPD,
    Garante, BfDI, etc.). Individual DPA collectors can be added later for
    deeper coverage.
    """

    def discover(self) -> list[DiscoveredDoc]:
        # GDPRHub uses Semantic MediaWiki — query for recent enforcement decisions
        docs: list[DiscoveredDoc] = []
        max_pages = self.config.get("max_pages", 20)

        offset = 0
        limit = 50
        for _ in range(max_pages):
            page_docs = self._query_gdprhub(offset, limit)
            if not page_docs:
                break
            docs.extend(page_docs)
            log.info(f"GDPR offset {offset}: found {len(page_docs)} cases (total: {len(docs)})")
            offset += limit

        log.info(f"GDPR discovery complete: {len(docs)} documents")
        return docs

    def _query_gdprhub(self, offset: int, limit: int) -> list[DiscoveredDoc]:
        """Query GDPRHub Semantic MediaWiki for enforcement decisions."""
        # Semantic MediaWiki ask query for DPA decisions
        params = {
            "title": "Special:Ask",
            "q": "[[Category:DPA Cases]]",
            "po": "?DPA|?Fine|?Date",
            "p[format]": "broadtable",
            "p[limit]": str(limit),
            "p[offset]": str(offset),
        }

        try:
            resp = requests.get(
                _GDPRHUB_URL,
                params=params,
                headers=self.get_headers(),
                timeout=HTTP_TIMEOUT,
            )
            resp.raise_for_status()
        except requests.RequestException as e:
            log.error(f"GDPRHub query failed (offset={offset}): {e}")
            return []

        soup = BeautifulSoup(resp.text, "lxml")
        docs: list[DiscoveredDoc] = []

        for row in soup.select("table.broadtable tr")[1:]:  # skip header
            cells = row.select("td")
            if not cells:
                continue

            link = cells[0].select_one("a")
            if not link:
                continue

            title = link.get_text(strip=True)
            href = link.get("href", "")
            if not href or not title:
                continue

            case_page_url = urljoin("https://gdprhub.eu", href)
            docs.append(DiscoveredDoc(
                case_title=title,
                source_page_url=case_page_url,
                document_url=case_page_url,
                file_type="html",
            ))

        return docs
