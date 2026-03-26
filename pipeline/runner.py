"""
Pipeline CLI runner — run the full pipeline or individual steps.

Usage:
    python -m pipeline.runner                          # full pipeline, all jurisdictions
    python -m pipeline.runner --step collect            # only discover new documents
    python -m pipeline.runner --step download           # only download discovered docs
    python -m pipeline.runner --step text               # only extract text from downloads
    python -m pipeline.runner --step extract            # only run Phase 1 extraction
    python -m pipeline.runner --step enrich             # only run Phase 2 enrichment
    python -m pipeline.runner --step url_fill           # resolve case source URLs
    python -m pipeline.runner --step save               # only save to cases table
    python -m pipeline.runner --step export             # only export to frontend JSON
    python -m pipeline.runner --jurisdiction us_ftc     # only process one jurisdiction
    python -m pipeline.runner --limit 10                # process max 10 documents per step
    python -m pipeline.runner --dry-run                 # preview what would happen
"""

from __future__ import annotations

import argparse
import logging
import sys

log = logging.getLogger("pipeline")

STEPS = ["collect", "download", "text", "extract", "enrich", "url_fill", "save", "export"]


def run_collect(jurisdiction_id: str | None = None, dry_run: bool = False, limit: int | None = None):
    """Step 1: Discover documents from jurisdiction sources."""
    from pipeline.collectors.registry import get_collector, list_registered
    from pipeline.db import get_conn

    jids = [jurisdiction_id] if jurisdiction_id else list_registered()
    total_discovered = 0

    for jid in jids:
        # Load config from DB
        config = {}
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT config_json, enabled FROM jurisdictions WHERE id = %s", (jid,))
                row = cur.fetchone()
                if row:
                    config = row[0] or {}
                    if not row[1]:
                        log.info(f"Skipping disabled jurisdiction: {jid}")
                        continue
                else:
                    log.warning(f"Jurisdiction {jid} not in DB, skipping")
                    continue

        try:
            collector = get_collector(jid, config)
        except (ValueError, ImportError) as e:
            log.warning(f"No collector for {jid}: {e}")
            continue

        log.info(f"Collecting from {jid}...")
        try:
            docs = collector.discover()
        except Exception as e:
            log.error(f"Collection failed for {jid}: {e}")
            continue

        if dry_run:
            log.info(f"  [DRY RUN] Would insert {len(docs)} discovered documents for {jid}")
            for d in docs[:5]:
                log.info(f"    - {d.case_title[:60]}... → {d.document_url[:60]}...")
            total_discovered += len(docs)
            continue

        # Insert into discovered_documents
        inserted = 0
        with get_conn() as conn:
            with conn.cursor() as cur:
                for d in docs:
                    try:
                        cur.execute(
                            """INSERT INTO discovered_documents
                               (jurisdiction_id, case_title, source_page_url, document_url, file_type)
                               VALUES (%s, %s, %s, %s, %s)
                               ON CONFLICT (jurisdiction_id, document_url) DO NOTHING""",
                            (jid, d.case_title, d.source_page_url, d.document_url, d.file_type),
                        )
                        if cur.rowcount > 0:
                            inserted += 1
                            # For OAIC: auto-create raw_document with pre-built summary
                            if d._oaic_summary:
                                from pipeline.processing.dedup import sha256_bytes
                                content = d._oaic_summary.encode("utf-8")
                                file_hash = sha256_bytes(content)
                                cur.execute("SELECT id FROM discovered_documents WHERE jurisdiction_id = %s AND document_url = %s", (jid, d.document_url))
                                dd_row = cur.fetchone()
                                if dd_row:
                                    dd_id = dd_row[0]
                                    cur.execute(
                                        """INSERT INTO raw_documents (document_id, file_name, file_hash, file_data, file_size, mime_type, extracted_text)
                                           VALUES (%s, %s, %s, %s, %s, %s, %s)
                                           ON CONFLICT (file_hash) DO NOTHING""",
                                        (dd_id, f"oaic-{dd_id}.txt", file_hash, content, len(content), "text/plain", d._oaic_summary),
                                    )
                                    cur.execute("UPDATE discovered_documents SET status = 'downloaded', downloaded_at = NOW() WHERE id = %s", (dd_id,))
                    except Exception as e:
                        log.warning(f"Insert failed for {d.document_url}: {e}")
            conn.commit()

        log.info(f"  {jid}: {inserted} new documents (of {len(docs)} discovered)")
        total_discovered += inserted

    return total_discovered


def run_download(jurisdiction_id: str | None = None, limit: int | None = None, dry_run: bool = False):
    """Step 2: Download discovered documents."""
    if dry_run:
        from pipeline.db import get_conn
        with get_conn() as conn:
            with conn.cursor() as cur:
                query = "SELECT COUNT(*) FROM discovered_documents WHERE status = 'discovered'"
                params: list = []
                if jurisdiction_id:
                    query += " AND jurisdiction_id = %s"
                    params.append(jurisdiction_id)
                cur.execute(query, params)
                count = cur.fetchone()[0]
        log.info(f"[DRY RUN] Would download {count} documents")
        return count

    from pipeline.processing.downloader import download_pending
    count = download_pending(jurisdiction_id, limit)
    log.info(f"Downloaded {count} documents")
    return count


def run_text_extraction(limit: int | None = None, dry_run: bool = False):
    """Step 3: Extract text from downloaded PDFs/HTML."""
    if dry_run:
        from pipeline.db import get_conn
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM raw_documents WHERE extracted_text IS NULL")
                count = cur.fetchone()[0]
        log.info(f"[DRY RUN] Would extract text from {count} documents")
        return count

    from pipeline.processing.text_extractor import extract_text_pending
    count = extract_text_pending(limit)
    log.info(f"Extracted text from {count} documents")
    return count


def run_extract(jurisdiction_id: str | None = None, limit: int | None = None, dry_run: bool = False):
    """Step 4: Phase 1 extraction via Claude."""
    if dry_run:
        log.info("[DRY RUN] Would run Phase 1 extraction on downloaded documents")
        return 0

    from pipeline.extraction.extractor import extract_pending
    count = extract_pending(jurisdiction_id, limit)
    log.info(f"Phase 1 extracted {count} documents")
    return count


def run_enrich(jurisdiction_id: str | None = None, limit: int | None = None, dry_run: bool = False):
    """Step 5: Phase 2 enrichment via Claude."""
    if dry_run:
        log.info("[DRY RUN] Would run Phase 2 enrichment on extracted documents")
        return 0

    from pipeline.extraction.enricher import enrich_pending
    count = enrich_pending(jurisdiction_id, limit)
    log.info(f"Phase 2 enriched {count} documents")
    return count


def run_url_fill(jurisdiction_id: str | None = None, limit: int | None = None, dry_run: bool = False):
    """Step 5b: Resolve case source URLs for cases missing them."""
    if dry_run:
        log.info("[DRY RUN] Would resolve case source URLs")
        return 0

    from pipeline.processing.url_resolver import resolve_urls
    count = resolve_urls(jurisdiction_id, limit, dry_run=False)
    log.info(f"Resolved {count} case source URLs")
    return count


def run_save(jurisdiction_id: str | None = None, limit: int | None = None, dry_run: bool = False):
    """Step 6: Save to cases table."""
    if dry_run:
        log.info("[DRY RUN] Would save enriched documents to cases table")
        return 0

    from pipeline.export.to_postgres import save_pending
    count = save_pending(jurisdiction_id, limit)
    log.info(f"Saved {count} cases to database")
    return count


def run_export(dry_run: bool = False):
    """Step 7: Export cases to generatedCases.json."""
    if dry_run:
        log.info("[DRY RUN] Would export cases to generatedCases.json")
        return 0

    from pipeline.export.to_frontend import export_to_json
    count = export_to_json()
    log.info(f"Exported {count} cases to frontend JSON")
    return count


def run_full_pipeline(jurisdiction_id: str | None = None, limit: int | None = None, dry_run: bool = False):
    """Run all steps sequentially."""
    log.info("=" * 60)
    log.info("Starting full pipeline run")
    log.info("=" * 60)

    from pipeline.db import init_schema
    init_schema()

    results = {}
    for step_name, step_fn in [
        ("collect", lambda: run_collect(jurisdiction_id, dry_run, limit)),
        ("download", lambda: run_download(jurisdiction_id, limit, dry_run)),
        ("text", lambda: run_text_extraction(limit, dry_run)),
        ("extract", lambda: run_extract(jurisdiction_id, limit, dry_run)),
        ("enrich", lambda: run_enrich(jurisdiction_id, limit, dry_run)),
        ("url_fill", lambda: run_url_fill(jurisdiction_id, limit, dry_run)),
        ("save", lambda: run_save(jurisdiction_id, limit, dry_run)),
        ("export", lambda: run_export(dry_run)),
    ]:
        log.info(f"--- Step: {step_name} ---")
        try:
            results[step_name] = step_fn()
        except Exception as e:
            log.error(f"Step {step_name} failed: {e}", exc_info=True)
            results[step_name] = f"ERROR: {e}"

    log.info("=" * 60)
    log.info("Pipeline complete. Results:")
    for step, result in results.items():
        log.info(f"  {step}: {result}")
    log.info("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="PrivacyGallery pipeline runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--step",
        choices=STEPS,
        help="Run a single pipeline step instead of the full pipeline",
    )
    parser.add_argument(
        "--jurisdiction", "-j",
        help="Only process this jurisdiction ID (e.g. us_ftc, uk_ico)",
    )
    parser.add_argument(
        "--limit", "-n",
        type=int,
        help="Max documents to process per step",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview what would happen without making changes",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable debug logging",
    )

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler("pipeline.log"),
        ],
    )

    if args.step:
        step_map = {
            "collect": lambda: run_collect(args.jurisdiction, args.dry_run, args.limit),
            "download": lambda: run_download(args.jurisdiction, args.limit, args.dry_run),
            "text": lambda: run_text_extraction(args.limit, args.dry_run),
            "extract": lambda: run_extract(args.jurisdiction, args.limit, args.dry_run),
            "enrich": lambda: run_enrich(args.jurisdiction, args.limit, args.dry_run),
            "url_fill": lambda: run_url_fill(args.jurisdiction, args.limit, args.dry_run),
            "save": lambda: run_save(args.jurisdiction, args.limit, args.dry_run),
            "export": lambda: run_export(args.dry_run),
        }
        try:
            step_map[args.step]()
        except Exception as e:
            log.error(f"Step {args.step} failed: {e}", exc_info=True)
            sys.exit(1)
    else:
        run_full_pipeline(args.jurisdiction, args.limit, args.dry_run)


if __name__ == "__main__":
    main()
