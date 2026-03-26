"""Australia OAIC collector — scrapes privacy determinations from oaic.gov.au.

Scrapes all pages of determinations, extracting case metadata and summary text
directly from the OAIC listing. Each case is stored as an HTML document containing
the structured summary (title, date, legislative provision, determination, catchwords).
The AustLII URL is preserved as source_page_url for linking.
"""

from __future__ import annotations

import logging
import time

import requests
from bs4 import BeautifulSoup

from pipeline.collectors.base import BaseCollector
from pipeline.config import HTTP_TIMEOUT
from pipeline.models import DiscoveredDoc

log = logging.getLogger(__name__)

_BASE_URL = "https://www.oaic.gov.au/privacy/privacy-assessments-and-decisions/privacy-decisions/privacy-determinations"


class OAICCollector(BaseCollector):
    """Discover OAIC privacy determinations by scraping the listing pages."""

    def discover(self) -> list[DiscoveredDoc]:
        docs: list[DiscoveredDoc] = []
        seen_urls: set[str] = set()
        page = 1

        # First page has no param; subsequent pages use result_26111_result_page=N
        next_url: str | None = _BASE_URL

        while next_url and page <= 20:  # safety limit
            try:
                resp = requests.get(next_url, headers=self.get_headers(), timeout=HTTP_TIMEOUT)
                resp.raise_for_status()
            except requests.RequestException as e:
                log.warning(f"OAIC page {page} fetch failed: {e}")
                break

            soup = BeautifulSoup(resp.text, "lxml")
            items = soup.select("article.custom-listing__item")

            if not items:
                break

            for item in items:
                cells = item.select(".custom-listing__cell")
                if len(cells) < 6:
                    continue

                # Extract structured data from cells
                title_text = cells[0].get_text(strip=True).removeprefix("Decision").strip()
                date_text = cells[1].get_text(strip=True).removeprefix("Decision year").strip()
                status_text = cells[2].get_text(strip=True).removeprefix("Status").strip()
                provision_text = cells[3].get_text(strip=True).removeprefix("Legislative provision").strip()
                determination_text = cells[4].get_text(strip=True).removeprefix("Determination").strip()
                catchword_text = cells[5].get_text(strip=True).removeprefix("Catchword summary").strip()

                # Get AustLII link
                austlii_link = item.select_one("a[href*='austlii']")
                austlii_url = austlii_link["href"].split("#")[0] if austlii_link else ""

                # Build a synthetic document containing all the summary text
                # This will be stored as the "document" for text extraction
                doc_content = f"""OAIC Privacy Determination
Title: {title_text}
Date: {date_text}
Status: {status_text}
Legislative Provision: {provision_text}
Determination: {determination_text}
Catchword Summary: {catchword_text}
Source: {austlii_url}"""

                # Use a stable URL as document_url for dedup
                # Use the OAIC page URL + case identifier
                doc_url = austlii_url or f"{_BASE_URL}#{title_text[:50]}"

                if doc_url in seen_urls:
                    continue
                seen_urls.add(doc_url)

                docs.append(DiscoveredDoc(
                    case_title=title_text,
                    source_page_url=austlii_url,
                    document_url=doc_url,
                    file_type="text",
                    # Store the pre-built summary as metadata for the downloader
                    _oaic_summary=doc_content,
                ))

            log.info(f"OAIC page {page}: found {len(items)} cases (total: {len(docs)})")

            # Find next page link
            next_link = None
            pag_links = soup.select("a.search-results__pagination-navlinks")
            for pl in pag_links:
                href = pl.get("href", "")
                text = pl.get_text(strip=True)
                if text == str(page + 1) and href:
                    next_link = href
                    break

            next_url = next_link
            page += 1
            time.sleep(0.5)  # Be polite

        log.info(f"OAIC discovery complete: {len(docs)} documents")
        return docs
