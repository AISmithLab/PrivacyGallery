"""California DOJ collector — scrapes CCPA/CPRA enforcement actions."""

from __future__ import annotations

import logging

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from pipeline.collectors.base import BaseCollector
from pipeline.config import HTTP_TIMEOUT
from pipeline.models import DiscoveredDoc

log = logging.getLogger(__name__)

_BASE_URL = "https://oag.ca.gov/privacy/privacy-enforcement-actions"


class CaliforniaDOJCollector(BaseCollector):
    """Discover California DOJ privacy enforcement actions."""

    def discover(self) -> list[DiscoveredDoc]:
        docs: list[DiscoveredDoc] = []

        try:
            resp = requests.get(_BASE_URL, headers=self.get_headers(), timeout=HTTP_TIMEOUT)
            resp.raise_for_status()
        except requests.RequestException as e:
            log.error(f"California DOJ fetch failed: {e}")
            return []

        soup = BeautifulSoup(resp.text, "lxml")

        # oag.ca.gov lists enforcement actions in a table or list
        for link in soup.select("a"):
            href = link.get("href", "")
            title = link.get_text(strip=True)

            if not href or not title or len(title) < 5:
                continue

            # Filter for enforcement-related links
            lower_href = href.lower()
            if not any(kw in lower_href for kw in ["/privacy/", "enforcement", "complaint", ".pdf"]):
                continue
            # Skip navigation/generic links
            if any(skip in lower_href for skip in ["/contact", "/about", "/careers", "/sitemap"]):
                continue

            page_url = urljoin("https://oag.ca.gov", href)

            if href.endswith(".pdf"):
                doc_url = page_url
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

        log.info(f"California DOJ discovery complete: {len(docs)} documents")
        return docs
