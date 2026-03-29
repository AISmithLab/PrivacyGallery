"""Canada OPC collector — scrapes Office of the Privacy Commissioner investigation pages.

Scrapes two sources:
  1. Investigations into businesses (PIPEDA): ~164 cases
  2. Investigations into federal institutions (Privacy Act): ~132 cases

All content is inline HTML (no PDFs). Pagination uses ?o=d&Page=N&Filter=True.
"""

from __future__ import annotations

import logging
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from pipeline.collectors.base import BaseCollector
from pipeline.config import HTTP_TIMEOUT
from pipeline.models import DiscoveredDoc

log = logging.getLogger(__name__)

_SOURCES = [
    {
        "name": "businesses",
        "base_url": "https://www.priv.gc.ca/en/opc-actions-and-decisions/investigations/investigations-into-businesses/",
        "base_path": "/en/opc-actions-and-decisions/investigations/investigations-into-businesses/",
    },
    {
        "name": "federal",
        "base_url": "https://www.priv.gc.ca/en/opc-actions-and-decisions/investigations/investigations-into-federal-institutions/",
        "base_path": "/en/opc-actions-and-decisions/investigations/investigations-into-federal-institutions/",
    },
]


class CanadaOPCCollector(BaseCollector):
    """Discover OPC investigation reports from both business and federal pages."""

    def discover(self) -> list[DiscoveredDoc]:
        docs: list[DiscoveredDoc] = []
        seen_urls: set[str] = set()

        for source in _SOURCES:
            page_num = 1
            while True:
                if page_num == 1:
                    url = source["base_url"]
                else:
                    url = f"{source['base_url']}?o=d&Page={page_num}&Filter=True"

                try:
                    resp = requests.get(url, headers=self.get_headers(), timeout=HTTP_TIMEOUT)
                    resp.raise_for_status()
                except requests.RequestException as e:
                    log.error(f"OPC {source['name']} page {page_num} fetch failed: {e}")
                    break

                soup = BeautifulSoup(resp.text, "lxml")
                page_docs = self._extract_cases(soup, source["base_path"], seen_urls)

                if not page_docs:
                    break

                docs.extend(page_docs)
                log.info(f"OPC {source['name']} page {page_num}: found {len(page_docs)} cases (total: {len(docs)})")

                # Check for next page by looking for a Page=N+1 link
                has_next = False
                for a in soup.select(f'a[href*="Page="]'):
                    href_val = a.get("href", "")
                    if f"Page={page_num + 1}" in href_val and "/en/" in href_val:
                        has_next = True
                        break
                if not has_next:
                    break

                page_num += 1
                if page_num > 25:  # Safety limit
                    break

        log.info(f"OPC discovery complete: {len(docs)} documents")
        return docs

    def _extract_cases(self, soup: BeautifulSoup, base_path: str, seen: set[str]) -> list[DiscoveredDoc]:
        """Extract case links from a listing page."""
        docs: list[DiscoveredDoc] = []

        for link in soup.select("a[href]"):
            href = link.get("href", "").strip()
            if not href:
                continue

            # Must be under the investigations path and have a case identifier
            if base_path not in href:
                continue

            # Skip the listing page itself
            remainder = href.split(base_path)[-1].strip("/")
            if not remainder:
                continue

            # Must have a year/identifier pattern (e.g., 2026/pipeda-2026-001)
            if "/" not in remainder:
                continue

            full_url = urljoin("https://www.priv.gc.ca", href)
            if full_url in seen:
                continue
            seen.add(full_url)

            title = link.get_text(strip=True)
            if not title or len(title) < 10:
                continue

            docs.append(DiscoveredDoc(
                case_title=title,
                source_page_url=full_url,
                document_url=full_url,
                file_type="html",
            ))

        return docs
