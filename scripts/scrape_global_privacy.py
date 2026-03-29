"""
Scrape DLA Piper Data Protection handbook for global privacy law info.
Outputs src/data/globalJurisdictions.json with country-level privacy law data.

Usage:
    python3 scripts/scrape_global_privacy.py
"""

import json
import re
import time
import logging
from pathlib import Path

import requests
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

BASE_URL = "https://www.dlapiperdataprotection.com/"
OUTPUT = Path(__file__).resolve().parents[1] / "src" / "data" / "globalJurisdictions.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}

# ISO 3166-1 alpha-2 to numeric mapping (for map highlighting)
ALPHA2_TO_NUMERIC = {
    "AL": "008", "DZ": "012", "AO": "024", "AR": "032", "AM": "051",
    "AU": "036", "AT": "040", "AZ": "031", "BS": "044", "BH": "048",
    "BD": "050", "BB": "052", "BY": "112", "BE": "056", "BJ": "204",
    "BM": "060", "BO": "068", "BA": "070", "BW": "072", "BR": "076",
    "BN": "096", "BG": "100", "BF": "854", "KH": "116", "CA": "124",
    "CV": "132", "KY": "136", "CL": "152", "CN": "156", "CO": "170",
    "CG": "178", "CD": "180", "CR": "188", "HR": "191", "CY": "196",
    "CZ": "203", "DK": "208", "DO": "214", "EC": "218", "EG": "818",
    "SV": "222", "EE": "233", "ET": "231", "FI": "246", "FR": "250",
    "DE": "276", "GH": "288", "GR": "300", "GT": "320", "HK": "344",
    "HU": "348", "IS": "352", "IN": "356", "ID": "360", "IE": "372",
    "IL": "376", "IT": "380", "JM": "388", "JP": "392", "JO": "400",
    "KZ": "398", "KE": "404", "KR": "410", "KW": "414", "LV": "428",
    "LT": "440", "LU": "442", "MO": "446", "MY": "458", "MT": "470",
    "MU": "480", "MX": "484", "MD": "498", "MA": "504", "MZ": "508",
    "NL": "528", "NZ": "554", "NG": "566", "NO": "578", "OM": "512",
    "PK": "586", "PA": "591", "PY": "600", "PE": "604", "PH": "608",
    "PL": "616", "PT": "620", "QA": "634", "RO": "642", "RU": "643",
    "RW": "646", "SA": "682", "SN": "686", "RS": "688", "SG": "702",
    "SK": "703", "SI": "705", "ZA": "710", "ES": "724", "LK": "144",
    "SE": "752", "CH": "756", "TW": "158", "TZ": "834", "TH": "764",
    "TN": "788", "TR": "792", "UG": "800", "UA": "804", "AE": "784",
    "GB": "826", "US": "840", "UY": "858", "VN": "704", "ZM": "894",
    "ZW": "716", "CI": "384", "GN": "324", "MG": "450", "NE": "562",
    "TG": "768", "TD": "148", "MW": "454", "NA": "516", "SZ": "748",
    "LS": "426", "GY": "328", "TT": "780", "BZ": "084", "HN": "340",
    "NI": "558", "CU": "192", "HT": "332", "MM": "104", "LA": "418",
    "NP": "524", "MN": "496", "GE": "268", "UZ": "860", "TM": "795",
    "KG": "417", "TJ": "762", "AF": "004", "IQ": "368", "SY": "760",
    "LB": "422", "LY": "434", "SD": "729", "ER": "232", "DJ": "262",
    "SO": "706", "YE": "887", "IR": "364", "CM": "120", "GA": "266",
    "GQ": "226", "CF": "140", "SS": "728",
}


def get_country_codes() -> list[dict]:
    """Extract country codes and names from the main page."""
    resp = requests.get(BASE_URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    countries = []
    seen = set()
    # Find country select options
    for opt in soup.select("select option"):
        code = opt.get("value", "").strip()
        name = opt.get_text(strip=True)
        if code and name and len(code) <= 3 and code not in seen and code != "Select an option":
            seen.add(code)
            countries.append({"code": code, "name": name})

    # If nothing found from select, parse JS
    if not countries:
        for m in re.finditer(r'"(\w{2,3})"\s*:\s*"([^"]+)"', resp.text):
            code, name = m.group(1), m.group(2)
            if code not in seen and len(name) > 2:
                seen.add(code)
                countries.append({"code": code, "name": name})

    return countries


def scrape_country(code: str, name: str) -> dict | None:
    """Scrape a single country page for privacy law data."""
    url = f"{BASE_URL}?c={code}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        log.warning(f"Failed to fetch {name} ({code}): {e}")
        return None

    soup = BeautifulSoup(resp.text, "lxml")
    main = soup.select_one("main.page-content") or soup

    # Extract sections by headings
    sections = {}
    current = None
    for el in main.find_all(["h2", "h3", "p", "li"]):
        if el.name in ("h2", "h3"):
            heading = el.get_text(strip=True)
            if 3 < len(heading) < 100:
                current = heading.lower()
                sections[current] = []
        elif current and el.name in ("p", "li"):
            text = el.get_text(strip=True)
            if text and len(text) > 15:
                sections[current].append(text)

    # Extract key fields
    overview = ""
    authority = ""
    enforcement = ""
    laws = []

    for heading, texts in sections.items():
        combined = " ".join(texts[:5])[:600]
        if not combined:
            continue

        if any(k in heading for k in ("definition of personal data", "law", "authority")):
            if "authority" in heading and not authority:
                authority = combined
            elif not overview and "definition" in heading:
                overview = combined

        if any(k in heading for k in ("enforcement", "sanction", "penalt")):
            enforcement = combined

        if "collection" in heading and not overview:
            overview = combined

    # Build a general overview from the first substantial section if still empty
    if not overview:
        for texts in sections.values():
            combined = " ".join(texts[:3])
            if len(combined) > 100:
                overview = combined[:600]
                break

    # Get ISO numeric code for map
    numeric_code = ALPHA2_TO_NUMERIC.get(code[:2], "")

    return {
        "code": code,
        "name": name,
        "numericCode": numeric_code,
        "overview": overview,
        "authority": authority,
        "mainLaws": laws,
        "enforcementStyle": enforcement,
    }


def main():
    log.info("Fetching country list...")
    countries = get_country_codes()
    log.info(f"Found {len(countries)} countries")

    results = []
    for i, country in enumerate(countries):
        code = country["code"]
        name = country["name"]

        # Skip special regional entries
        if len(code) > 2 and code not in ("BQ1",):
            log.info(f"[{i+1}/{len(countries)}] Skipping regional entry {name} ({code})")
            continue

        log.info(f"[{i+1}/{len(countries)}] Scraping {name} ({code})...")
        data = scrape_country(code, name)
        if data:
            results.append(data)

        time.sleep(0.3)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    log.info(f"Wrote {len(results)} countries to {OUTPUT}")


if __name__ == "__main__":
    main()
