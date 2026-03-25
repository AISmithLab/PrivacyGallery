"""EU EDPB collector — scrapes EDPB consistency findings and decisions."""

from __future__ import annotations

import logging

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from pipeline.collectors.base import BaseCollector
from pipeline.config import HTTP_TIMEOUT
from pipeline.models import DiscoveredDoc

log = logging.getLogger(__name__)

_BASE_URL = "https://www.edpb.europa.eu/our-work-tools/consistency-findings_en"


class EDPBCollector(BaseCollector):
    """Discover EDPB decisions and consistency findings."""

    def discover(self) -> list[DiscoveredDoc]:
        docs: list[DiscoveredDoc] = []
        page = 0
        max_pages = self.config.get("max_pages", 10)

        while page < max_pages:
            url = f"{_BASE_URL}?page={page}" if page > 0 else _BASE_URL
            page_docs = self._scrape_page(url)
            if not page_docs:
                break
            docs.extend(page_docs)
            log.info(f"EDPB page {page}: found {len(page_docs)} items (total: {len(docs)})")
            page += 1

        log.info(f"EDPB discovery complete: {len(docs)} documents")
        return docs

    def _scrape_page(self, url: str) -> list[DiscoveredDoc]:
        try:
            resp = requests.get(url, headers=self.get_headers(), timeout=HTTP_TIMEOUT)
            resp.raise_for_status()
        except requests.RequestException as e:
            log.error(f"EDPB fetch failed: {e}")
            return []

        soup = BeautifulSoup(resp.text, "lxml")
        docs: list[DiscoveredDoc] = []

        for item in soup.select("article, div.views-row, li.views-row"):
            link = item.select_one("a")
            if not link:
                continue

            title = link.get_text(strip=True)
            href = link.get("href", "")
            if not href or not title:
                continue

            page_url = urljoin("https://www.edpb.europa.eu", href)

            pdf_link = item.select_one("a[href$='.pdf']")
            if pdf_link:
                doc_url = urljoin("https://www.edpb.europa.eu", pdf_link.get("href", ""))
                file_type = "pdf"
            else:
                doc_url = page_url
                file_type = "html"

            docs.append(DiscoveredDoc(
                case_title=title,
                source_page_url=page_url,
                document_url=doc_url,
                file_type=file_type,
            ))

        return docs
