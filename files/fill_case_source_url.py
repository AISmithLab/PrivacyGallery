"""
Fill case_source_url for cases where it's missing
==================================================
Uses CSV lookup (ICO/PDPC/OAIC), Claude + programmatic construction to find
regulator case page URLs. When PDF is available, Claude reads the document.
Ensures ALL cases get a webpage URL by storing the best candidate even if it 404s.

Usage:
    cd files
    python fill_case_source_url.py

Optional env:
    FILL_URL_LIMIT=N  - process only first N cases with missing URL
    FILL_DRY=1        - don't write to DB, just print
    SKIP_VERIFY=1     - don't verify URLs (faster, but may save broken links)
    REVERIFY=1        - re-check existing URLs: replace if broken OR if wrong type (e.g. press release)
"""

import base64
import csv
import json
import os
import re
from pathlib import Path
from urllib.parse import unquote, urlparse

import anthropic
import requests
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

_AGENT_DIR = Path(__file__).resolve().parent
DONE_DIR = Path(os.getenv("DONE_DIR", str(_AGENT_DIR / "processed")))
INBOX_DIR = _AGENT_DIR / "inbox"
DB_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/privacy_cases")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY")
MODEL = os.getenv("REVISE_MODEL", "claude-haiku-4-5")
FILL_URL_LIMIT = os.getenv("FILL_URL_LIMIT") or os.getenv("FILL_LIMIT")
FILL_CASE_IDS = os.getenv("FILL_CASE_IDS")
FILL_DRY = os.getenv("FILL_DRY", "").lower() in ("1", "true", "yes")
SKIP_VERIFY = os.getenv("SKIP_VERIFY", "").lower() in ("1", "true", "yes")
REVERIFY = os.getenv("REVERIFY", "").lower() in ("1", "true", "yes")  # Re-check existing URLs, replace if broken

PROMPT = """Search for this privacy enforcement case to find the official regulator case webpage URL.

Use your knowledge to look up: case name + company + jurisdiction + year. The regulator (FTC, ICO, PDPC, etc.) publishes case pages with complaint PDFs. Find that case page URL.

Company: {company}
Jurisdiction: {jurisdiction}
Year: {year}
Case name (if known): {case_name}

Search strategy: Combine "[company]" + "[jurisdiction]" + "[year]" + "enforcement" or "case" to find the regulator's official case page. Return the URL of the case page (not press releases or news).

CRITICAL: Return ONLY a WORKING official case URL. The PDFs came from regulator case pages—use the same URL format. NEVER use press releases or news.
- US FTC: https://www.ftc.gov/legal-library/browse/cases-proceedings/[matter]-[company-slug] (e.g. 122-3158-path-inc, 132-3078-snapchat-inc-matter). Use the FTC matter/docket number from the complaint if the document mentions it.
- UK ICO: https://ico.org.uk/action-weve-taken/enforcement/[slug]/ — if 404, use gov.uk: https://www.gov.uk/government/publications/[slug]
- Singapore PDPC: https://www.pdpc.gov.sg/all-commissions-decisions/[YYYY]/[MM]/breach-of-the-protection-obligation-by-[company-slug] (MUST include the breach prefix; e.g. breach-of-the-protection-obligation-by-peoplesearch, breach-of-the-protection-obligation-by-rise-aerospace-pte-ltd)
- EU/GDPR: National DPA case pages (aepd.es, garante.it, cnil.fr)

FORBIDDEN: ftc.gov/news-events, press-releases, news articles. Return null if unsure the URL works.
If unsure the URL works, use null.

Return ONLY a valid JSON object:
{{
  "case_source_url": "https://..." or null
}}
"""

PROMPT_PDF = """You have a legal/regulatory document for {company} ({jurisdiction}, {year}).

Extract the official regulator case page URL from this document. Look for:
- FTC: Matter/docket number (e.g. 122-3158, 132 3078) — the complaint or header usually states it
- PDPC: Decision date (YYYY/MM) and company name in the decision title
- ICO: Case reference or enforcement page slug
- Or a direct URL to the case page if mentioned

Return the FULL working URL, or the data needed to build it. Use these exact formats:
- FTC: https://www.ftc.gov/legal-library/browse/cases-proceedings/[matter]-[company-slug] (matter like 122-3158, slug like path-inc)
- PDPC: https://www.pdpc.gov.sg/all-commissions-decisions/[YYYY]/[MM]/breach-of-the-protection-obligation-by-[company-slug]

Return ONLY a valid JSON object:
{{
  "case_source_url": "https://..." or null,
  "ftc_matter": "122-3158" or null,
  "pdpc_year_month": "2020/12" or null
}}
"""


# Manual fixes keyed by PDF filename — survives case ID resets (verified working URLs)
MANUAL_URL_FIXES: dict[str, str] = {
    "Guzzetta_ Victor L._ d_b_a Smart Data Systems__complaint_1.pdf":
        "https://www.ftc.gov/legal-library/browse/cases-proceedings/012-3066-guzzetta-victor-l-dba-smart-data-systems",
    "Uber Technologies_ Inc._ In the Matter of__complaint_1.pdf":
        "https://www.ftc.gov/legal-library/browse/cases-proceedings/152-3054-uber-technologies-inc-matter",
    "Ortho-Clinical Diagnostics_ Inc._ In the Matter of__complaint_1.pdf":
        "https://www.ftc.gov/legal-library/browse/cases-proceedings/192-3050-ortho-clinical-diagnostics-inc-matter",
    "GoDaddy Inc_ and GoDaddy.com_ LLC__complaint_1.pdf":
        "https://www.ftc.gov/legal-library/browse/cases-proceedings/2023133-godaddy-inc-et-al-matter",
    "Apartment Hunters_ Inc.__complaint_1.pdf":
        "https://www.ftc.gov/legal-library/browse/cases-proceedings/172-3007-apartment-hunters-inc-et-al-wetakesection8com",
    "Tricolor Auto Acceptance_ LLC__complaint_1.pdf":
        "https://www.ftc.gov/legal-library/browse/cases-proceedings/142-3073-tricolor-auto-acceptance-llc",
    "TRENDnet_ Inc.__complaint_1.pdf":
        "https://www.ftc.gov/legal-library/browse/cases-proceedings/122-3090-trendnet-inc-matter",
    "Mobilewalla_ Inc.__complaint_1.pdf":
        "https://www.ftc.gov/legal-library/browse/cases-proceedings/202-3196-mobilewalla-inc-matter",
    "Snapchat_ Inc._ In the Matter of__complaint_1.pdf":
        "https://www.ftc.gov/legal-library/browse/cases-proceedings/132-3078-snapchat-inc-matter",
    "Level 3 Communications_ LLC_ In the Matter of__complaint_1.pdf":
        "https://www.ftc.gov/legal-library/browse/cases-proceedings/142-3028-level-3-communications-llc-matter",
}


def _filename_from_url(url: str) -> str:
    """Extract filename from URL (last path segment, decoded)."""
    if not url:
        return ""
    path = urlparse(url).path
    name = path.split("/")[-1] if path else ""
    return unquote(name).strip()


def load_csv_case_urls() -> dict[str, str]:
    """Build lookup: pdf_filename -> case_page_url from ICO, PDPC, OAIC CSVs."""
    lookup: dict[str, str] = {}
    # ICO: case_url is case page, pdf_url gives filename
    ico_csv = INBOX_DIR / "UK - ICO" / "ico_enforcement_pdf_urls.csv"
    if ico_csv.exists():
        with open(ico_csv, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                case_url = (row.get("case_url") or "").strip()
                pdf_url = (row.get("pdf_url") or "").strip()
                fn = _filename_from_url(pdf_url)
                if fn and case_url:
                    lookup[fn] = case_url
                    lookup[fn.lower()] = case_url
    # PDPC: case_url is case page
    pdpc_csv = INBOX_DIR / "Singapore - PDPC" / "pdpc_commission_decisions_pdf_urls.csv"
    if pdpc_csv.exists():
        with open(pdpc_csv, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                case_url = (row.get("case_url") or "").strip()
                pdf_url = (row.get("pdf_url") or "").strip()
                fn = _filename_from_url(pdf_url)
                if fn and case_url:
                    lookup[fn] = case_url
                    lookup[fn.lower()] = case_url
    # OAIC: austlii_url is case page (HTML)
    oaic_csv = INBOX_DIR / "Australia - OAIC" / "oaic_privacy_determinations_pdf_urls.csv"
    if oaic_csv.exists():
        with open(oaic_csv, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                case_url = (row.get("austlii_url") or row.get("case_url") or "").strip()
                pdf_url = (row.get("pdf_url") or "").strip()
                fn = _filename_from_url(pdf_url)
                if fn and case_url and not case_url.lower().endswith(".pdf"):
                    lookup[fn] = case_url
                    lookup[fn.lower()] = case_url
    return lookup


def find_pdf(file_name: str) -> Path | None:
    if not file_name:
        return None
    for p in DONE_DIR.rglob("*.pdf"):
        if p.name == file_name:
            return p
    return None


def slugify_company(company: str) -> str:
    """Convert company name to URL slug (lowercase, hyphens, no legal suffixes)."""
    s = (company or "").strip()
    s = re.sub(r",?\s+(Pte\.?\s*Ltd\.?|Ltd\.?|Limited|Inc\.?|LLC|Corp\.?|Corporation)\s*$", "", s, flags=re.I)
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[-\s]+", "-", s).strip("-").lower()
    return s or "company"


# URL patterns we reject: press releases, news, etc. — not the actual case page
BAD_URL_PATTERNS = (
    "/news-events/",
    "/press-releases/",
    "/news/",
    "/media/",
    "/blog/",
    "newsroom",
    "press-release",
    "/novedades/",  # Spanish: news
    "/prensa-y-comunicacion/",  # Spanish: press and communications
    "/prensa-y-medios/",  # Spanish: press and media
    "/notas-de-prensa/",  # Spanish: press releases
)


def is_acceptable_case_url(url: str, jurisdiction: str) -> bool:
    """Reject press releases and news; require legal library / enforcement pages."""
    if not url or not url.startswith("http"):
        return False
    url_lower = url.lower()
    for bad in BAD_URL_PATTERNS:
        if bad in url_lower:
            return False
    # FTC: prefer legal-library; reject anything that isn't the case proceedings
    if "ftc.gov" in url_lower:
        return "legal-library" in url_lower or "cases-proceedings" in url_lower
    return True


def url_works(url: str) -> bool:
    if SKIP_VERIFY:
        return True
    try:
        r = requests.head(
            url,
            timeout=10,
            allow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; PrivacyGallery/1.0)"},
        )
        return 200 <= r.status_code < 400
    except Exception:
        return False


def infer_url_with_pdf(pdf_path: Path, company: str, jurisdiction: str, year) -> str | None:
    """Use Claude to extract URL or matter number from the PDF document."""
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    with open(pdf_path, "rb") as f:
        pdf_b64 = base64.standard_b64encode(f.read()).decode("utf-8")
    prompt = PROMPT_PDF.format(
        company=company or "?",
        jurisdiction=jurisdiction or "unknown",
        year=year or "?",
    )
    msg = client.messages.create(
        model=MODEL,
        max_tokens=512,
        system="Return ONLY a valid JSON object — no markdown, no explanation.",
        messages=[{
            "role": "user",
            "content": [
                {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": pdf_b64}},
                {"type": "text", "text": prompt},
            ],
        }],
    )
    raw = msg.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    data = json.loads(raw)
    url = (data.get("case_source_url") or "").strip()
    if url and url.startswith("http"):
        return url
    # Build from extracted data if we have it
    if "US FTC" in jurisdiction or "FTC" in jurisdiction:
        matter = (data.get("ftc_matter") or "").strip().replace(" ", "-")
        if matter:
            slug = slugify_company(company)
            candidate = f"https://www.ftc.gov/legal-library/browse/cases-proceedings/{matter}-{slug}"
            if url_works(candidate):
                return candidate
    if "Singapore PDPC" in jurisdiction or "PDPC" in jurisdiction:
        ym = (data.get("pdpc_year_month") or "").strip()
        if "/" in ym:
            parts = ym.split("/")
            if len(parts) >= 2 and parts[0].isdigit() and parts[1].isdigit():
                yy, mm = parts[0], parts[1]
                slug = slugify_company(company)
                candidate = f"https://www.pdpc.gov.sg/all-commissions-decisions/{yy}/{mm}/breach-of-the-protection-obligation-by-{slug}"
                if url_works(candidate):
                    return candidate
    return None


PDPC_BREACH_PREFIXES = (
    "breach-of-the-protection-obligation-by",
    "breach-of-the-accountability-obligation-by",
    "breach-of-the-protection-and-accountability-obligations-by",
    "breach-of-the-protection-and-retention-obligations-by",
)


def try_pdpc_urls(company: str, year: int) -> str | None:
    """Try programmatic PDPC URLs for months 01-12 with various breach prefixes."""
    slug = slugify_company(company)
    base = "https://www.pdpc.gov.sg/all-commissions-decisions"
    for prefix in PDPC_BREACH_PREFIXES:
        for mm in range(1, 13):
            url = f"{base}/{year}/{mm:02d}/{prefix}-{slug}"
            if url_works(url):
                return url
    return None


def infer_url(company: str, jurisdiction: str, year, case_name: str) -> str | None:
    """Claude text-only inference (no PDF)."""
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    prompt = PROMPT.format(
        company=company or "?",
        jurisdiction=jurisdiction or "unknown",
        year=year or "?",
        case_name=(case_name or "")[:200],
    )
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


def main():
    if not ANTHROPIC_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not set")
    if not DB_URL:
        raise RuntimeError("DATABASE_URL not set")

    limit = int(FILL_URL_LIMIT) if FILL_URL_LIMIT and FILL_URL_LIMIT.isdigit() else None
    if FILL_DRY:
        print("DRY RUN — no DB updates")

    conn = psycopg2.connect(DB_URL)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("SELECT id, file_name, raw_json FROM cases ORDER BY id")
            rows = cur.fetchall()

        case_ids = None
        if FILL_CASE_IDS:
            case_ids = [int(x.strip()) for x in FILL_CASE_IDS.split(",") if x.strip().isdigit()]
        to_process = []
        for row in rows:
            rid = row["id"]
            if case_ids and rid not in case_ids:
                continue
            raw = row.get("raw_json")
            data = json.loads(raw) if isinstance(raw, str) else (raw or {})
            file_name = row.get("file_name") or ""
            url = (data.get("case_source_url") or "").strip()
            needs_url = not url or not url.startswith("http")
            bad_url = url and (not url_works(url) or not is_acceptable_case_url(url, data.get("jurisdiction") or ""))
            if needs_url:
                to_process.append((rid, data, file_name))
            elif REVERIFY and bad_url:
                to_process.append((rid, data, file_name))

        if limit and not case_ids:
            to_process = to_process[:limit]
        total = len(to_process)
        print(f"Filling case_source_url for {total} cases")

        csv_lookup = load_csv_case_urls()
        if csv_lookup:
            print(f"Loaded {len(set(csv_lookup.values()))} case URLs from CSV (ICO/PDPC/OAIC)")

        updated = 0
        for rid, data, file_name in to_process:
            company = data.get("company") or "?"
            jurisdiction = data.get("jurisdiction") or ""
            year = data.get("year") or "?"
            case_name = data.get("case_name") or ""
            try:
                url = None
                from_csv = False

                # 0a. Manual fixes keyed by PDF filename (survives ID resets)
                if file_name and file_name in MANUAL_URL_FIXES:
                    url = MANUAL_URL_FIXES[file_name]

                # 0b. CSV lookup (authoritative case_url from ICO/PDPC/OAIC)
                if not url and file_name:
                    url = csv_lookup.get(file_name) or csv_lookup.get(file_name.lower())
                    if url:
                        from_csv = True

                pdf_path = find_pdf(file_name)

                # 1. If we have PDF and no CSV match: Claude reads document
                if not url and pdf_path:
                    url = infer_url_with_pdf(pdf_path, company, jurisdiction, year)

                # 2. PDPC: try programmatic URLs (breach-of-the-protection-obligation-by-[slug])
                if not url and ("Singapore PDPC" in jurisdiction or "PDPC" in jurisdiction):
                    year_int = int(year) if year else 0
                    if year_int:
                        url = try_pdpc_urls(company, year_int)

                # 3. Fallback: Claude text-only inference
                if not url:
                    url = infer_url(company, jurisdiction, year, case_name)

                # Only store URLs that are acceptable (right format) AND verified (200 OK)
                if url and is_acceptable_case_url(url, jurisdiction) and url_works(url):
                    data["case_source_url"] = url
                    if not FILL_DRY:
                        with conn.cursor() as cur:
                            cur.execute(
                                "UPDATE cases SET raw_json = %s WHERE id = %s",
                                (json.dumps(data), rid),
                            )
                        conn.commit()
                    updated += 1
                    status = " (from CSV)" if from_csv else ""
                    print(f"  [{rid}] {company}: {url[:60]}...{status}")
                elif url and is_acceptable_case_url(url, jurisdiction):
                    print(f"  [{rid}] {company}: URL not saved (404/unreachable)")
                elif url and not is_acceptable_case_url(url, jurisdiction):
                    print(f"  [{rid}] {company}: URL rejected (press release / wrong type)")
                    # If REVERIFY and we had a bad URL, clear it
                    if REVERIFY and (data.get("case_source_url") or "").strip():
                        data["case_source_url"] = ""
                        if not FILL_DRY:
                            with conn.cursor() as cur:
                                cur.execute(
                                    "UPDATE cases SET raw_json = %s WHERE id = %s",
                                    (json.dumps(data), rid),
                                )
                            conn.commit()
                        updated += 1
                        print(f"  [{rid}] {company}: cleared broken URL")
                else:
                    # No URL found; if REVERIFY and we had a bad URL, clear it
                    if REVERIFY and (data.get("case_source_url") or "").strip():
                        data["case_source_url"] = ""
                        if not FILL_DRY:
                            with conn.cursor() as cur:
                                cur.execute(
                                    "UPDATE cases SET raw_json = %s WHERE id = %s",
                                    (json.dumps(data), rid),
                                )
                            conn.commit()
                        updated += 1
                        print(f"  [{rid}] {company}: cleared broken URL (no replacement)")
                    else:
                        print(f"  [{rid}] {company}: not found")
            except Exception as e:
                print(f"  [{rid}] {company}: error — {e}")

        print(f"\nDone. Updated {updated} cases.")
        if updated and not FILL_DRY:
            print("Run: python export_to_frontend.py  # to refresh frontend")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
