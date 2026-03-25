"""
US FTC collector — scrapes the FTC's legal library for privacy enforcement cases.

Source: https://www.ftc.gov/legal-library/browse/cases-proceedings
Filters for privacy/data-security topics. Paginates through results.
"""

from __future__ import annotations

import logging
import re
from urllib.parse import urljoin, urlencode

import requests
from bs4 import BeautifulSoup

from pipeline.collectors.base import BaseCollector
from pipeline.config import HTTP_TIMEOUT
from pipeline.models import DiscoveredDoc

log = logging.getLogger(__name__)

# FTC legal library search filtered to privacy-related case types
_BASE_URL = "https://www.ftc.gov/legal-library/browse/cases-proceedings"

# Default topics: Privacy and Data Security
_DEFAULT_TOPICS = [
    "Consumer Privacy",
    "Data Security",
    "Children's Privacy",
]


class FTCCollector(BaseCollector):
    """Discover FTC enforcement case PDFs from the legal library."""

    def discover(self) -> list[DiscoveredDoc]:
        docs: list[DiscoveredDoc] = []
        page = 0
        max_pages = self.config.get("max_pages", 50)

        while page < max_pages:
            page_docs = self._scrape_page(page)
            if not page_docs:
                break
            docs.extend(page_docs)
            log.info(f"FTC page {page}: found {len(page_docs)} cases (total: {len(docs)})")
            page += 1

        log.info(f"FTC discovery complete: {len(docs)} documents")
        return docs

    def _scrape_page(self, page: int) -> list[DiscoveredDoc]:
        """Scrape one page of the FTC legal library listing."""
        params = {"page": page}
        url = f"{_BASE_URL}?{urlencode(params)}"

        try:
            resp = requests.get(url, headers=self.get_headers(), timeout=HTTP_TIMEOUT)
            resp.raise_for_status()
        except requests.RequestException as e:
            log.error(f"FTC page {page} fetch failed: {e}")
            return []

        soup = BeautifulSoup(resp.text, "lxml")
        docs: list[DiscoveredDoc] = []

        # Find case listing items — FTC uses article or div elements with case links
        for item in soup.select("li.views-row, div.views-row, article"):
            doc = self._parse_case_item(item)
            if doc:
                docs.append(doc)

        return docs

    def _parse_case_item(self, item) -> DiscoveredDoc | None:
        """Extract case title, page URL, and PDF link from a listing item."""
        # Find the case title link
        link = item.select_one("a[href*='/legal-library/'], a[href*='/cases-proceedings/']")
        if not link:
            # Try any heading link
            link = item.select_one("h2 a, h3 a, .title a, a.field-title")
        if not link:
            return None

        title = link.get_text(strip=True)
        href = link.get("href", "")
        if not href:
            return None

        case_page_url = urljoin("https://www.ftc.gov", href)

        # Check if this is actually a case proceedings page
        if "/legal-library/" not in case_page_url and "/cases-proceedings/" not in case_page_url:
            return None

        # Look for a direct PDF link in the listing
        pdf_link = item.select_one("a[href$='.pdf']")
        if pdf_link:
            pdf_url = urljoin("https://www.ftc.gov", pdf_link.get("href", ""))
        else:
            # Use the case page URL — we'll extract PDFs from the case page during download
            pdf_url = case_page_url

        file_type = "pdf" if pdf_url.endswith(".pdf") else "html"

        return DiscoveredDoc(
            case_title=title,
            source_page_url=case_page_url,
            document_url=pdf_url,
            file_type=file_type,
        )

    @staticmethod
    def extract_pdfs_from_case_page(case_page_url: str, headers: dict | None = None) -> list[str]:
        """
        Given an FTC case page URL, find all complaint/decision PDF links.
        Useful for the download step when we only have the case page URL.
        """
        try:
            resp = requests.get(
                case_page_url,
                headers=headers or {"User-Agent": "Mozilla/5.0 (compatible; PrivacyGallery/2.0)"},
                timeout=HTTP_TIMEOUT,
            )
            resp.raise_for_status()
        except requests.RequestException:
            return []

        soup = BeautifulSoup(resp.text, "lxml")
        pdf_urls = []
        for a in soup.select("a[href$='.pdf']"):
            href = a.get("href", "")
            if href:
                pdf_urls.append(urljoin(case_page_url, href))

        return list(dict.fromkeys(pdf_urls))  # deduplicate preserving order
