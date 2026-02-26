"""
Iterates through all remaining EU countries (excluding Austria, Belgium, Bulgaria,
Cyprus, Czech Republic, Denmark) and extracts GDPR PDF links from Enforcement Tracker.
Same logic as Cyprus: filter by country, then get direct PDFs or extract from HTML pages.
"""

import time
import csv
import urllib3
import requests

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException

MAIN_URL = "https://www.enforcementtracker.com/"
PDF_DELIMITER = " | "

# Countries already completed (have dedicated scripts)
COMPLETED = {"AUSTRIA", "BELGIUM", "BULGARIA", "CYPRUS", "CZECH REPUBLIC", "CZECHIA", "DENMARK"}

# All countries from the filter - (sidebar_id, display_name, table_match_terms)
# table_match_terms: list of strings that might appear in the Country column
COUNTRIES = [
    ("EU", "EU", ["EU"]),
    ("AUSTRIA", "AUSTRIA", ["AUSTRIA"]),
    ("BELGIUM", "BELGIUM", ["BELGIUM"]),
    ("BULGARIA", "BULGARIA", ["BULGARIA"]),
    ("CROATIA", "CROATIA", ["CROATIA"]),
    ("CYPRUS", "CYPRUS", ["CYPRUS"]),
    ("CZECH REPUBLIC", "CZECH REPUBLIC", ["CZECH REPUBLIC", "CZECHIA"]),
    ("DENMARK", "DENMARK", ["DENMARK"]),
    ("ESTONIA", "ESTONIA", ["ESTONIA"]),
    ("FINLAND", "FINLAND", ["FINLAND"]),
    ("FRANCE", "FRANCE", ["FRANCE"]),
    ("GERMANY", "GERMANY", ["GERMANY"]),
    ("GREECE", "GREECE", ["GREECE"]),
    ("HUNGARY", "HUNGARY", ["HUNGARY"]),
    ("ICELAND", "ICELAND", ["ICELAND"]),
    ("IRELAND", "IRELAND", ["IRELAND"]),
    ("ISLE OF MAN", "ISLE OF MAN", ["ISLE OF MAN"]),
    ("ITALY", "ITALY", ["ITALY"]),
    ("LATVIA", "LATVIA", ["LATVIA"]),
    ("LIECHTENSTEIN", "LIECHTENSTEIN", ["LIECHTENSTEIN"]),
    ("LITHUANIA", "LITHUANIA", ["LITHUANIA"]),
    ("LUXEMBOURG", "LUXEMBOURG", ["LUXEMBOURG"]),
    ("MALTA", "MALTA", ["MALTA"]),
    ("NORWAY", "NORWAY", ["NORWAY"]),
    ("POLAND", "POLAND", ["POLAND"]),
    ("PORTUGAL", "PORTUGAL", ["PORTUGAL"]),
    ("ROMANIA", "ROMANIA", ["ROMANIA"]),
    ("SLOVAKIA", "SLOVAKIA", ["SLOVAKIA"]),
    ("SLOVENIA", "SLOVENIA", ["SLOVENIA"]),
    ("SPAIN", "SPAIN", ["SPAIN"]),
    ("SWEDEN", "SWEDEN", ["SWEDEN"]),
    ("NETHERLANDS", "NETHERLANDS", ["NETHERLANDS"]),
    ("UNITED KINGDOM", "UNITED KINGDOM", ["UNITED KINGDOM", "UK"]),
]


def _csv_filename(display_name):
    """Convert display name to CSV filename."""
    slug = display_name.lower().replace(" ", "_")
    return f"{slug}_gdpr_pdfs.csv"


def filter_and_get_source_links(driver, country_id, display_name, match_terms):
    """Filter by country and scrape Source URLs."""
    driver.get(MAIN_URL)

    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.ID, "penalties"))
    )
    time.sleep(3)

    # Click country in sidebar (some have alternate IDs)
    try_ids = [country_id]
    if country_id == "CZECH REPUBLIC":
        try_ids.append("CZECHIA")
    for cid in try_ids:
        try:
            btn = driver.find_element(By.ID, cid)
            driver.execute_script("arguments[0].click();", btn)
            time.sleep(2)
            print(f"  Filtered by {display_name}.")
            break
        except NoSuchElementException:
            continue
    else:
        try:
            driver.execute_script(
                f"if (typeof draw_Countries === 'function') draw_Countries('{country_id}');"
            )
            time.sleep(2)
            print(f"  Filtered by {display_name} (draw_Countries).")
        except Exception:
            pass

    source_links = []

    while True:
        rows = driver.find_elements(By.XPATH, "//table[@id='penalties']/tbody/tr")

        for row in rows:
            try:
                cols = row.find_elements(By.TAG_NAME, "td")

                if len(cols) > 11:
                    country_text = cols[2].text.strip().upper()

                    if any(term in country_text for term in match_terms):
                        source_a = cols[11].find_element(By.TAG_NAME, "a")
                        link_url = source_a.get_attribute("href")
                        etid = cols[1].text.strip()

                        if link_url and "enforcementtracker.com" not in (link_url or ""):
                            source_links.append({"ETid": etid, "Source_URL": link_url})
            except NoSuchElementException:
                continue

        try:
            next_button = driver.find_element(By.ID, "penalties_next")
            if "disabled" in next_button.get_attribute("class"):
                break

            driver.execute_script("arguments[0].click();", next_button)
            time.sleep(1.5)
        except NoSuchElementException:
            break

    return source_links


def _is_direct_pdf_url(url):
    if not url:
        return False
    path_part = url.split("?")[0].lower()
    return path_part.endswith(".pdf") or (".pdf" in path_part and "/$file/" in url.lower())


def extract_pdf_from_source(url):
    """Direct PDF return as-is; else fetch page and extract all PDF links."""
    url = (url or "").strip()
    if not url or url.startswith("Error"):
        return url

    if _is_direct_pdf_url(url):
        return url

    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        response = requests.get(url, headers=headers, timeout=15, verify=False)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        base = url
        pdf_urls = []

        for a in soup.find_all("a", href=True):
            href = a.get("href", "").strip()
            if ".pdf" not in href.lower():
                continue

            full_url = urljoin(base, href)
            if full_url not in pdf_urls:
                pdf_urls.append(full_url)

        if pdf_urls:
            return PDF_DELIMITER.join(pdf_urls)

        return url

    except Exception as e:
        return f"Error fetching page: {e}"


def main():
    # Only process countries not yet completed
    to_process = [
        (cid, dname, terms)
        for cid, dname, terms in COUNTRIES
        if dname.upper() not in COMPLETED and cid.upper() not in COMPLETED
    ]

    if not to_process:
        print("All countries already completed.")
        return

    print(f"Processing {len(to_process)} countries: {[c[1] for c in to_process]}\n")

    options = webdriver.ChromeOptions()
    driver = None

    try:
        driver = webdriver.Chrome(options=options)

        for country_id, display_name, match_terms in to_process:
            output_csv = _csv_filename(display_name)
            print(f"\n--- {display_name} ---")

            records = filter_and_get_source_links(
                driver, country_id, display_name, [t.upper() for t in match_terms]
            )

            print(f"  Found {len(records)} records. Extracting PDFs...")

            with open(output_csv, mode="w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(["Country", "ETid", "Source_URL", "PDF_URL"])

                for record in records:
                    pdf_url = extract_pdf_from_source(record["Source_URL"])
                    writer.writerow([
                        display_name,
                        record["ETid"],
                        record["Source_URL"],
                        pdf_url,
                    ])
                    time.sleep(0.5)

            print(f"  Saved to {output_csv}.")

        print("\nDone!")

    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        input("Press Enter to close...")
    finally:
        if driver:
            driver.quit()


if __name__ == "__main__":
    main()
