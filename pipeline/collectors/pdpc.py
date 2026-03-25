"""Singapore PDPC collector — scrapes PDPC commission decisions."""

from __future__ import annotations

import logging

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from pipeline.collectors.base import BaseCollector
from pipeline.config import HTTP_TIMEOUT
from pipeline.models import DiscoveredDoc

log = logging.getLogger(__name__)

_BASE_URL = "https://www.pdpc.gov.sg/all-commissions-decisions"


class PDPCCollector(BaseCollector):
    """Discover PDPC commission decision PDFs."""

    def discover(self) -> list[DiscoveredDoc]:
        docs: list[DiscoveredDoc] = []

        try:
            resp = requests.get(_BASE_URL, headers=self.get_headers(), timeout=HTTP_TIMEOUT)
            resp.raise_for_status()
        except requests.RequestException as e:
            log.error(f"PDPC fetch failed: {e}")
            return []

        soup = BeautifulSoup(resp.text, "lxml")

        # PDPC lists decisions by year/month with links to individual decision pages
        for link in soup.select("a[href*='/all-commissions-decisions/']"):
            href = link.get("href", "")
            title = link.get_text(strip=True)
            if not href or not title:
                continue
            # Skip year/month index pages — we want individual decision pages
            # Decision pages typically have company names in the slug
            if href.rstrip("/").count("/") < 5:
                continue

            case_page_url = urljoin("https://www.pdpc.gov.sg", href)
            docs.append(DiscoveredDoc(
                case_title=title,
                source_page_url=case_page_url,
                document_url=case_page_url,  # PDFs extracted from case page during download
                file_type="html",
            ))

        log.info(f"PDPC discovery complete: {len(docs)} documents")
        return docs
