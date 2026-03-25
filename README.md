# The Privacy Jury

A global registry of **787+ data privacy enforcement cases** across 7 jurisdictions, totaling **$532M+** in fines. Browse cases, compare enforcement actions side-by-side, explore jurisdictions on an interactive map, and learn what privacy enforcement terms actually mean.

**Live site**: [jury.privacydev.org](https://jury.privacydev.org)

---

## How It Works

The project has two halves: an **automated data pipeline** that discovers, downloads, and extracts structured case data from regulator websites using Claude AI, and a **React frontend** that presents it as an interactive gallery.

### Data Pipeline

```
Regulator Websites (FTC, ICO, PDPC, OAIC, EU DPAs, CA DOJ)
    |
    v
Collectors (jurisdiction-specific scrapers)
    |
    v
Document Discovery Log (PostgreSQL: discovered_documents)
    |
    v
Downloader (raw PDFs/HTML stored as BLOBs in PostgreSQL)
    |
    v
Text Extractor (pymupdf: PDF → clean text, locally, no API cost)
    |
    v
Phase 1: Extraction (Claude Haiku → structured fields from document)
    |
    v
Phase 2: Enrichment (Claude Haiku → company context, narratives, impact estimates)
    |
    v
URL Resolver (finds official case page URLs per jurisdiction)
    |
    v
Validation & Normalization → PostgreSQL (cases table)
    |
    v
Export → generatedCases.json → React Frontend (static build)
```

#### Pipeline Steps

| Step | Command | API Cost | Description |
|------|---------|----------|-------------|
| **Collect** | `--step collect` | Free | Scrapes regulator websites to discover new case document URLs |
| **Download** | `--step download` | Free | Fetches PDFs/HTML, stores as BLOBs in PostgreSQL |
| **Text** | `--step text` | Free | Converts PDFs to clean text via pymupdf (local) |
| **Extract** | `--step extract` | ~$0.01/doc | Claude extracts structured fields (company, fines, violations, legal bases) |
| **Enrich** | `--step enrich` | ~$0.01/doc | Claude adds company context, narratives, impact estimates |
| **URL Fill** | `--step url_fill` | ~$0.005/doc | Resolves official regulator case page URLs |
| **Save** | `--step save` | Free | Writes validated data to PostgreSQL `cases` table |
| **Export** | `--step export` | Free | Generates `generatedCases.json` for the frontend |

#### Two-Phase AI Extraction

**Phase 1 — Document Extraction:** Reads the document text and extracts fields directly stated in the document: case name, jurisdiction, year, company, sector, violation type, legal bases violated, enforcement outcomes, penalty amounts, individuals affected, legal findings, and severity.

**Phase 2 — AI Enrichment:** Uses Phase 1 data plus outside knowledge to fill contextual fields: `whatTheyDid` (195-char narrative), `whyTheyWereWrong` (195-char harm description), company description, company valuation, founding year, current company status, impacted individuals (estimated when not in document), and claims vs reality.

Each phase is independently re-runnable. You can re-enrich all cases without re-extracting, or re-extract specific documents without touching enrichment.

#### Deduplication

- Documents are deduped by `(jurisdiction_id, document_url)` — same URL won't be re-downloaded
- Raw files are deduped by SHA256 hash — same content won't be re-processed
- Existing cases in the database are skipped during extraction

### Severity Score

Each case gets a deterministic severity rating (1-5) based on:
- **Data sensitivity (1-3):** Health/biometric/children/financial = 3, Location/identity/credit = 2, Everything else = 1
- **People impacted (0-2):** 1M+ = 2, 10K-999K = 1, <10K or unknown = 0
- **Final score** = data + people, clamped to [1, 5]

---

## Pages

| Page | Route | Description |
|------|-------|-------------|
| **Cases** | `/` | Searchable, filterable grid of all cases with jurisdiction, sector, violation type, and sort controls |
| **Case Detail** | `/case/:id` | Full case breakdown — what they did, why they were wrong, claims vs reality, legal findings, outcome, attached PDFs |
| **Compare** | `/compare` | Matrix view (patterns across jurisdictions/violations/sectors) and side-by-side comparison of up to 3 individual cases |
| **Explore** | `/explore` | Interactive world map highlighting 7 jurisdictions; click a region to see its enforcement framework, key laws, and dataset statistics |
| **Leaderboard** | `/leaderboard` | Rankings — top companies by fines, most active jurisdictions, most common violations and sectors |
| **Learn** | `/learn` | Educational glossary explaining enforcement outcomes, violation types, and key legal concepts with cross-references |
| **About** | `/about` | Project information and attribution |

---

## Jurisdictions Covered

| Jurisdiction | Abbreviation | Region |
|---|---|---|
| Federal Trade Commission | US FTC | United States |
| California DOJ | CA DOJ | United States (California) |
| Information Commissioner's Office | UK ICO | United Kingdom |
| Personal Data Protection Commission | SG PDPC | Singapore |
| General Data Protection Regulation | EU GDPR | European Union |
| European Data Protection Board | EU EDPB | European Union |
| Office of the Australian Information Commissioner | AU OAIC | Australia |

---

## Tech Stack

### Frontend
- **React 18** + **TypeScript 5** — UI framework
- **Vite 5** — Build tool and dev server
- **Tailwind CSS 3** — Utility-first styling
- **shadcn/ui** + **Radix UI** — Component library (50+ components)
- **react-simple-maps** — Interactive SVG world map on Explore page
- **Recharts** — Data visualization charts
- **TanStack React Query** — Data fetching/caching
- **React Router DOM** — Client-side routing
- **Lucide React** — Icons

### Data Pipeline
- **Python 3** — Pipeline orchestration
- **Anthropic SDK** — Claude API for document extraction and enrichment
- **PostgreSQL** + **psycopg2** — Database and raw document storage (BLOBs)
- **PyMuPDF (pymupdf)** — PDF text extraction (local, no API cost)
- **BeautifulSoup4** — HTML parsing for collectors and HTML documents
- **python-dotenv** — Environment variable management

### Deployment
- **GitHub Pages** — Static hosting
- **GitHub Actions** — CI/CD (auto-deploys on push to main)
- **Custom domain** — jury.privacydev.org

---

## Project Structure

```
PrivacyGallery/
├── src/
│   ├── pages/                    # Page components
│   │   ├── Index.tsx             # Home — case gallery with search/filter/sort
│   │   ├── CaseDetail.tsx        # Individual case breakdown
│   │   ├── Compare.tsx           # Matrix & side-by-side case comparison
│   │   ├── Explore.tsx           # Interactive jurisdiction map
│   │   ├── Leaderboard.tsx       # Rankings and statistics
│   │   ├── Learn.tsx             # Educational glossary
│   │   ├── About.tsx             # Project information
│   │   └── NotFound.tsx          # 404 page
│   ├── components/
│   │   ├── TopNav.tsx            # Yellow navigation bar
│   │   ├── CaseCard.tsx          # Case summary card with red fine stamp
│   │   ├── ControlBar.tsx        # Filter/sort controls
│   │   ├── SearchBar.tsx         # Search input
│   │   ├── JurisdictionMap.tsx   # SVG world map (react-simple-maps)
│   │   ├── JurisdictionDetail.tsx# Jurisdiction stats and info panel
│   │   ├── JurisdictionLogos.tsx # Jurisdiction logo/icon display
│   │   ├── ScrollToTop.tsx       # Scroll reset on route change
│   │   └── ui/                   # 50+ shadcn/ui components
│   ├── data/
│   │   ├── cases.ts              # Type definitions, utilities, case loading
│   │   ├── generatedCases.json   # 787+ cases exported from PostgreSQL
│   │   ├── jurisdictionInfo.ts   # Jurisdiction metadata (laws, authorities)
│   │   └── glossary.ts           # Learn page glossary content
│   ├── hooks/                    # Custom React hooks
│   ├── lib/utils.ts              # Tailwind class merge utility
│   ├── main.tsx                  # App entry point
│   └── index.css                 # Global styles and CSS variables
├── pipeline/                     # Automated data pipeline
│   ├── config.py                 # DB URL, API key, model settings
│   ├── db.py                     # Connection pool, schema init
│   ├── models.py                 # Dataclasses for all entities
│   ├── runner.py                 # CLI entry point (--step, --jurisdiction, --limit)
│   ├── migrate.py                # One-time migration + jurisdiction seeding
│   ├── collectors/               # Jurisdiction-specific scrapers
│   │   ├── base.py               # BaseCollector ABC
│   │   ├── registry.py           # Collector factory
│   │   ├── ftc.py                # US FTC
│   │   ├── ico.py                # UK ICO
│   │   ├── pdpc.py               # Singapore PDPC
│   │   ├── oaic.py               # Australia OAIC
│   │   ├── gdpr.py               # EU GDPR (per-country DPAs)
│   │   ├── california_doj.py     # California DOJ
│   │   └── edpb.py               # EU EDPB
│   ├── processing/               # Download, dedup, text extraction
│   │   ├── downloader.py         # Fetch documents, store as BLOBs
│   │   ├── dedup.py              # SHA256 hash deduplication
│   │   ├── text_extractor.py     # PDF→text (pymupdf), HTML→text (bs4)
│   │   └── url_resolver.py       # Find official case page URLs
│   ├── extraction/               # AI extraction (two-phase)
│   │   ├── prompts.py            # Phase 1 + Phase 2 prompt templates
│   │   ├── extractor.py          # Phase 1: structured fields from text
│   │   ├── enricher.py           # Phase 2: company context + narratives
│   │   └── parser.py             # JSON response parsing
│   ├── validation/               # Field validation and normalization
│   │   ├── validator.py          # Missing values, impossible fines, dates
│   │   └── normalizer.py         # Jurisdiction/sector/violation mapping
│   └── export/                   # Output generation
│       ├── to_postgres.py        # Write to cases table
│       └── to_frontend.py        # cases → generatedCases.json
├── files/                        # Legacy pipeline scripts (archived)
│   ├── agent.py                  # Original PDF → Claude → PostgreSQL
│   ├── export_to_frontend.py     # Original PostgreSQL → JSON export
│   └── ...
├── .github/workflows/
│   └── deploy.yml                # GitHub Actions → GitHub Pages
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Getting Started

### Frontend

Requires Node.js 20+ — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

```sh
git clone https://github.com/AISmithLab/PrivacyGallery.git
cd PrivacyGallery
npm install
npm run dev
```

The site runs at `http://localhost:8080`. Case data is already included in `generatedCases.json`.

### Data Pipeline

Only needed if you want to collect new cases or rebuild the dataset.

**Prerequisites:** Python 3.12+, PostgreSQL running locally.

```sh
# Install dependencies
pip install -r pipeline/requirements.txt

# Configure environment
cp files/.env.example files/.env
# Edit files/.env with your ANTHROPIC_API_KEY and DATABASE_URL

# Initialize database tables and seed jurisdictions
python3 -m pipeline.migrate
```

**Run the full pipeline:**
```sh
python3 -m pipeline.runner
```

**Run individual steps:**
```sh
python3 -m pipeline.runner --step collect                    # discover new documents
python3 -m pipeline.runner --step download                   # fetch PDFs/HTML
python3 -m pipeline.runner --step text                       # extract text locally
python3 -m pipeline.runner --step extract                    # Phase 1: Claude extraction
python3 -m pipeline.runner --step enrich                     # Phase 2: Claude enrichment
python3 -m pipeline.runner --step url_fill                   # resolve case page URLs
python3 -m pipeline.runner --step save                       # write to PostgreSQL
python3 -m pipeline.runner --step export                     # generate frontend JSON
```

**Filter by jurisdiction or limit:**
```sh
python3 -m pipeline.runner --jurisdiction us_ftc             # one jurisdiction only
python3 -m pipeline.runner --step extract --limit 5          # process max 5 documents
python3 -m pipeline.runner --dry-run                         # preview without changes
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key for document extraction and enrichment |
| `DATABASE_URL` | PostgreSQL connection string |
| `EXTRACTION_MODEL` | Model for Phase 1 extraction (default: `claude-haiku-4-5`) |
| `ENRICHMENT_MODEL` | Model for Phase 2 enrichment (default: `claude-haiku-4-5`) |

---

## Database Schema

The pipeline uses 6 PostgreSQL tables:

| Table | Purpose |
|-------|---------|
| `jurisdictions` | Registry of data sources (regulator URLs, crawl frequency, access method) |
| `discovered_documents` | Every document found by collectors (URL, status, jurisdiction) |
| `raw_documents` | Downloaded files stored as BLOBs with extracted text |
| `extraction_runs` | Audit log for each AI call (phase, model, tokens, response) |
| `pipeline_log` | Monitoring and failure logs |
| `cases` | Final structured case data (feeds the frontend export) |

---

## Deployment

The site auto-deploys to GitHub Pages on every push to `main` via GitHub Actions. The workflow:

1. Checks out code
2. Installs Node.js 20 and dependencies
3. Builds with `npm run build`
4. Copies `index.html` to `404.html` for SPA routing
5. Deploys to GitHub Pages

Custom domain configured via `public/CNAME` → `jury.privacydev.org`

---

## Key Data Types

```typescript
interface EnforcementCase {
  id: string;
  company: string;
  sector: Sector;                    // Technology, Healthcare, Finance, etc.
  jurisdiction: Jurisdiction;         // US FTC, UK ICO, EU GDPR, etc.
  year: number;
  fineAmount: number;
  fineDisplay: string;
  violations: ViolationType[];        // Misrepresentation, Failure to disclose, etc.
  severityForIndividuals: number;     // 1-5 calculated score
  impactedIndividuals: string;
  whatTheyDid: string;                // Plain-language summary
  whyTheyWereWrong: string;          // Why it matters
  claimsVsReality: ClaimVsReality[]; // What they said vs what they did
  regulatoryFindings: RegulatoryFinding[];
  outcome: string;
  outcomeSummary: string;             // Complaint Filed, Consent Order, etc.
  attachedPDFs: AttachedPDF[];        // Links to source documents
  // ... 40+ additional fields
}
```

---

## License

This project is maintained by [AISmithLab](https://github.com/AISmithLab).
