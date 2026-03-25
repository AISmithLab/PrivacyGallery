"""UK ICO collector — scrapes ICO enforcement actions page."""

from __future__ import annotations

import logging

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from pipeline.collectors.base import BaseCollector
from pipeline.config import HTTP_TIMEOUT
from pipeline.models import DiscoveredDoc

log = logging.getLogger(__name__)

_BASE_URL = "https://ico.org.uk/action-weve-taken/enforcement/"


class ICOCollector(BaseCollector):
    """Discover ICO enforcement case PDFs."""

    def discover(self) -> list[DiscoveredDoc]:
        docs: list[DiscoveredDoc] = []
        page = 1
        max_pages = self.config.get("max_pages", 30)

        while page <= max_pages:
            url = f"{_BASE_URL}?page={page}" if page > 1 else _BASE_URL
            page_docs = self._scrape_page(url)
            if not page_docs:
                break
            docs.extend(page_docs)
            log.info(f"ICO page {page}: found {len(page_docs)} cases (total: {len(docs)})")
            page += 1

        log.info(f"ICO discovery complete: {len(docs)} documents")
        return docs

    def _scrape_page(self, url: str) -> list[DiscoveredDoc]:
        try:
            resp = requests.get(url, headers=self.get_headers(), timeout=HTTP_TIMEOUT)
            resp.raise_for_status()
        except requests.RequestException as e:
            log.error(f"ICO fetch failed: {e}")
            return []

        soup = BeautifulSoup(resp.text, "lxml")
        docs: list[DiscoveredDoc] = []

        for item in soup.select("article, .search-result, li.views-row, div.views-row"):
            link = item.select_one("a[href*='/enforcement/']")
            if not link:
                link = item.select_one("h2 a, h3 a, a")
            if not link:
                continue

            title = link.get_text(strip=True)
            href = link.get("href", "")
            if not href or not title:
                continue

            case_page_url = urljoin("https://ico.org.uk", href)

            # Look for PDF link
            pdf_link = item.select_one("a[href$='.pdf']")
            if pdf_link:
                doc_url = urljoin("https://ico.org.uk", pdf_link.get("href", ""))
                file_type = "pdf"
            else:
                doc_url = case_page_url
                file_type = "html"

            docs.append(DiscoveredDoc(
                case_title=title,
                source_page_url=case_page_url,
                document_url=doc_url,
                file_type=file_type,
            ))

        return docs
