"""Singapore PDPC collector — discovers commission decisions.

Primary source: CSV file with case_url + pdf_url pairs (160 historical decisions).
Secondary: Attempts to scrape the live page for newer decisions (page uses JS rendering,
so this may return 0 results — the CSV is the reliable source).
"""

from __future__ import annotations

import csv
import logging
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from pipeline.collectors.base import BaseCollector
from pipeline.config import HTTP_TIMEOUT
from pipeline.models import DiscoveredDoc

log = logging.getLogger(__name__)

_BASE_URL = "https://www.pdpc.gov.sg/all-commissions-decisions"
_CSV_PATH = Path(__file__).resolve().parents[2] / "files" / "inbox" / "Singapore - PDPC" / "pdpc_commission_decisions_pdf_urls.csv"


class PDPCCollector(BaseCollector):
    """Discover PDPC commission decision PDFs from CSV + live scraping."""

    def discover(self) -> list[DiscoveredDoc]:
        docs: list[DiscoveredDoc] = []
        seen_urls: set[str] = set()

        # ── Primary: CSV with verified case URLs and PDF URLs ────────────
        if _CSV_PATH.exists():
            with open(_CSV_PATH, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    case_url = (row.get("case_url") or "").strip()
                    pdf_url = (row.get("pdf_url") or "").strip()
                    title = (row.get("case_title") or "").strip()

                    if not pdf_url or not pdf_url.startswith("http"):
                        continue

                    # Use PDF URL as the document to download
                    if pdf_url in seen_urls:
                        continue
                    seen_urls.add(pdf_url)

                    # Extract a readable title from the case URL slug if CSV title is generic
                    if not title or title.startswith("pdpc_case_"):
                        title = self._title_from_url(case_url)

                    docs.append(DiscoveredDoc(
                        case_title=title,
                        source_page_url=case_url,
                        document_url=pdf_url,
                        file_type="pdf",
                    ))

            log.info(f"PDPC CSV: loaded {len(docs)} decisions from {_CSV_PATH.name}")

        # ── Secondary: Try live scraping for newer decisions ─────────────
        # Note: PDPC uses client-side JS rendering, so this often returns 0.
        # It's here as a fallback for when the site structure changes.
        try:
            resp = requests.get(_BASE_URL, headers=self.get_headers(), timeout=HTTP_TIMEOUT)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "lxml")

            live_count = 0
            for link in soup.select("a[href*='/all-commissions-decisions/']"):
                href = link.get("href", "")
                title = link.get_text(strip=True)
                if not href or not title:
                    continue
                # Skip year/month index pages
                if href.rstrip("/").count("/") < 5:
                    continue

                case_page_url = urljoin("https://www.pdpc.gov.sg", href)
                if case_page_url in seen_urls:
                    continue
                seen_urls.add(case_page_url)

                docs.append(DiscoveredDoc(
                    case_title=title,
                    source_page_url=case_page_url,
                    document_url=case_page_url,
                    file_type="html",
                ))
                live_count += 1

            if live_count:
                log.info(f"PDPC live scrape: found {live_count} additional decisions")

        except requests.RequestException as e:
            log.warning(f"PDPC live scrape failed (CSV data still used): {e}")

        log.info(f"PDPC discovery complete: {len(docs)} documents")
        return docs

    @staticmethod
    def _title_from_url(url: str) -> str:
        """Extract readable title from PDPC case URL slug."""
        if not url:
            return "PDPC Decision"
        # URL format: .../YYYY/MM/breach-of-the-protection-obligation-by-company-name
        slug = url.rstrip("/").split("/")[-1]
        # Convert hyphens to spaces, title case
        return slug.replace("-", " ").title()
