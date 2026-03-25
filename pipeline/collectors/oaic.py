"""Australia OAIC collector — scrapes OAIC privacy decisions."""

from __future__ import annotations

import logging

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from pipeline.collectors.base import BaseCollector
from pipeline.config import HTTP_TIMEOUT
from pipeline.models import DiscoveredDoc

log = logging.getLogger(__name__)

_BASE_URL = "https://www.oaic.gov.au/privacy/privacy-decisions"


class OAICCollector(BaseCollector):
    """Discover OAIC privacy decision documents."""

    def discover(self) -> list[DiscoveredDoc]:
        docs: list[DiscoveredDoc] = []

        try:
            resp = requests.get(_BASE_URL, headers=self.get_headers(), timeout=HTTP_TIMEOUT)
            resp.raise_for_status()
        except requests.RequestException as e:
            log.error(f"OAIC fetch failed: {e}")
            return []

        soup = BeautifulSoup(resp.text, "lxml")

        for link in soup.select("a[href*='/privacy-decisions/'], a[href*='/privacy/determinations/']"):
            href = link.get("href", "")
            title = link.get_text(strip=True)
            if not href or not title or len(title) < 5:
                continue

            case_page_url = urljoin("https://www.oaic.gov.au", href)

            # Check for PDF link vs HTML decision
            if href.endswith(".pdf"):
                doc_url = case_page_url
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

        log.info(f"OAIC discovery complete: {len(docs)} documents")
        return docs
