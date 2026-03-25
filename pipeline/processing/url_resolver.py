"""
Resolve case source URLs for cases missing them.
Integrated from files/fill_case_source_url.py into the pipeline.

Tiered strategy:
  1. Use source_page_url from discovered_documents (already collected)
  2. Claude text-only inference using company + jurisdiction + year
  3. URL verification (HEAD request)

Updates both:
  - discovered_documents.source_page_url (for future exports)
  - cases.raw_json.case_source_url (for current exports)
"""

import json
import logging
import re
from typing import Optional

import anthropic
import psycopg2
import psycopg2.extras
import requests

from pipeline.config import DATABASE_URL, ANTHROPIC_API_KEY, EXTRACTION_MODEL

log = logging.getLogger(__name__)

MODEL = EXTRACTION_MODEL

# ── URL patterns we reject ───────────────────────────────────────────────────

BAD_URL_PATTERNS = (
    "/news-events/", "/press-releases/", "/news/", "/media/",
    "/blog/", "newsroom", "press-release",
    "/novedades/", "/prensa-y-comunicacion/", "/prensa-y-medios/", "/notas-de-prensa/",
)


def is_acceptable_case_url(url: str, jurisdiction: str) -> bool:
    if not url or not url.startswith("http"):
        return False
    url_lower = url.lower()
    for bad in BAD_URL_PATTERNS:
        if bad in url_lower:
            return False
    if "ftc.gov" in url_lower:
        return "legal-library" in url_lower or "cases-proceedings" in url_lower
    # Reject generic listing pages
    if url.rstrip("/").endswith("/cases-proceedings"):
        return False
    return True


def url_works(url: str) -> bool:
    headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
    # Try HEAD first, fall back to GET (some sites block HEAD)
    for method in (requests.head, requests.get):
        try:
            kwargs = {"timeout": 10, "allow_redirects": True, "headers": headers}
            if method == requests.get:
                kwargs["stream"] = True  # don't download body
            r = method(url, **kwargs)
            if 200 <= r.status_code < 400:
                return True
        except Exception:
            continue
    return False


# Trusted regulator domains — save URL even if it 404s (site may be temporarily down)
TRUSTED_DOMAINS = (
    "ftc.gov", "ico.org.uk", "pdpc.gov.sg", "oaic.gov.au", "austlii.edu.au",
    "cnil.fr", "aepd.es", "garante.it", "datatilsynet.no", "dpa.gr",
    "edpb.europa.eu", "oag.ca.gov", "gov.uk",
    "naih.hu",  # Hungarian DPA
    "giodo.gov.pl",  # Polish DPA
)


def slugify_company(company: str) -> str:
    s = (company or "").strip()
    s = re.sub(r",?\s+(Pte\.?\s*Ltd\.?|Ltd\.?|Limited|Inc\.?|LLC|Corp\.?|Corporation)\s*$", "", s, flags=re.I)
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[-\s]+", "-", s).strip("-").lower()
    return s or "company"


# ── Claude inference ─────────────────────────────────────────────────────────

INFER_PROMPT = """Find the official regulator case webpage URL for this privacy enforcement case.

Company: {company}
Jurisdiction: {jurisdiction}
Year: {year}
Case name: {case_name}

Use these exact URL formats:
- US FTC: https://www.ftc.gov/legal-library/browse/cases-proceedings/[matter]-[company-slug]
- UK ICO: https://ico.org.uk/action-weve-taken/enforcement/[slug]/
- Singapore PDPC: https://www.pdpc.gov.sg/all-commissions-decisions/[YYYY]/[MM]/breach-of-the-protection-obligation-by-[company-slug]
- California DOJ: https://oag.ca.gov/privacy/enforcement/[slug]
- EU/GDPR: National DPA case pages (aepd.es, garante.it, cnil.fr, datatilsynet.no, etc.)
- Australia OAIC: AustLII case page

FORBIDDEN: press releases, news articles, blog posts. Return null if unsure.

Return ONLY a valid JSON object:
{{
  "case_source_url": "https://..." or null
}}"""


def infer_url(company: str, jurisdiction: str, year, case_name: str) -> Optional[str]:
    """Claude text-only inference to find case page URL."""
    if not ANTHROPIC_API_KEY:
        return None
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    prompt = INFER_PROMPT.format(
        company=company or "?",
        jurisdiction=jurisdiction or "unknown",
        year=year or "?",
        case_name=(case_name or "")[:200],
    )
    try:
        msg = client.messages.create(
            model=MODEL,
            max_tokens=512,
            system="Return ONLY a valid JSON object — no markdown, no explanation.",
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
        data = json.loads(raw)
        url = (data.get("case_source_url") or "").strip()
        return url if url and url.startswith("http") else None
    except Exception as e:
        log.warning(f"Claude URL inference failed: {e}")
        return None


# ── PDPC programmatic URL builder ────────────────────────────────────────────

PDPC_BREACH_PREFIXES = (
    "breach-of-the-protection-obligation-by",
    "breach-of-the-accountability-obligation-by",
    "breach-of-the-protection-and-accountability-obligations-by",
    "breach-of-the-protection-and-retention-obligations-by",
)


def try_pdpc_urls(company: str, year: int) -> Optional[str]:
    slug = slugify_company(company)
    base = "https://www.pdpc.gov.sg/all-commissions-decisions"
    for prefix in PDPC_BREACH_PREFIXES:
        for mm in range(1, 13):
            url = f"{base}/{year}/{mm:02d}/{prefix}-{slug}"
            if url_works(url):
                return url
    return None


# ── Main pipeline step ───────────────────────────────────────────────────────


def resolve_urls(jurisdiction_id: Optional[str] = None, limit: Optional[int] = None,
                 dry_run: bool = False, skip_verify: bool = False) -> int:
    """
    Find and store case source URLs for cases that are missing them.
    Returns count of cases updated.
    """
    conn = psycopg2.connect(DATABASE_URL)
    updated = 0

    try:
        # Find cases missing case_source_url
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            query = """
                SELECT c.id, c.file_name, c.raw_json, c.document_id,
                       dd.source_page_url, dd.document_url, dd.jurisdiction_id
                FROM cases c
                LEFT JOIN discovered_documents dd ON c.document_id = dd.id
                WHERE (c.raw_json->>'case_source_url' IS NULL
                       OR c.raw_json->>'case_source_url' = ''
                       OR NOT c.raw_json->>'case_source_url' LIKE 'http%%')
            """
            params: list = []
            if jurisdiction_id:
                query += " AND dd.jurisdiction_id = %s"
                params.append(jurisdiction_id)
            query += " ORDER BY c.id"
            if limit:
                query += " LIMIT %s"
                params.append(limit)
            cur.execute(query, params if params else None)
            rows = cur.fetchall()

        total = len(rows)
        log.info(f"URL resolution: {total} cases need URLs")

        for row in rows:
            rid = row["id"]
            raw = row.get("raw_json")
            data = json.loads(raw) if isinstance(raw, str) else (raw or {})
            company = data.get("company") or "?"
            jurisdiction = data.get("jurisdiction") or ""
            year = data.get("year") or "?"
            case_name = data.get("case_name") or ""
            doc_id = row.get("document_id")

            url = None

            try:
                # Tier 1: Check if discovered_documents already has an acceptable URL
                dd_source = (row.get("source_page_url") or "").strip()
                if dd_source and is_acceptable_case_url(dd_source, jurisdiction):
                    if skip_verify or url_works(dd_source):
                        url = dd_source

                # Tier 2: PDPC programmatic URL builder
                if not url and ("PDPC" in jurisdiction or "Singapore" in jurisdiction):
                    year_int = int(year) if str(year).isdigit() else 0
                    if year_int:
                        url = try_pdpc_urls(company, year_int)

                # Tier 3: Claude text-only inference
                if not url:
                    url = infer_url(company, jurisdiction, year, case_name)

                # Validate and store
                if url and is_acceptable_case_url(url, jurisdiction):
                    verified = skip_verify or url_works(url)
                    # Accept unverified URLs from trusted regulator domains
                    is_trusted = any(d in url.lower() for d in TRUSTED_DOMAINS)
                    if verified or is_trusted:
                        if not dry_run:
                            data["case_source_url"] = url
                            with conn.cursor() as cur2:
                                # Update raw_json in cases table
                                cur2.execute(
                                    "UPDATE cases SET raw_json = %s WHERE id = %s",
                                    (json.dumps(data), rid),
                                )
                                # Also update discovered_documents.source_page_url
                                if doc_id:
                                    cur2.execute(
                                        "UPDATE discovered_documents SET source_page_url = %s WHERE id = %s AND (source_page_url IS NULL OR source_page_url = '' OR source_page_url LIKE '%%/cases-proceedings')",
                                        (url, doc_id),
                                    )
                            conn.commit()
                        updated += 1
                        status = "" if verified else " (unverified, trusted domain)"
                        log.info(f"  [{rid}] {company}: {url[:80]}{status}")
                    else:
                        log.info(f"  [{rid}] {company}: URL found but 404/unreachable (untrusted domain)")
                elif url:
                    log.info(f"  [{rid}] {company}: URL rejected (press release / wrong type)")
                else:
                    log.info(f"  [{rid}] {company}: not found")

            except Exception as e:
                log.warning(f"  [{rid}] {company}: error — {e}")

        log.info(f"URL resolution complete: {updated}/{total} updated")
        return updated

    finally:
        conn.close()
