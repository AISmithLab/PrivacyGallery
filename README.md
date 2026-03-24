# The Privacy Jury

A global registry of **771 data privacy enforcement cases** across 7 jurisdictions, totaling **$507M+** in fines. Browse cases, compare enforcement actions side-by-side, explore jurisdictions on an interactive map, and learn what privacy enforcement terms actually mean.

**Live site**: [jury.privacydev.org](https://jury.privacydev.org)

---

## How It Works

The project has two halves: a **data pipeline** that extracts structured case data from legal PDFs using Claude AI, and a **React frontend** that presents it as an interactive gallery.

### Data Pipeline

```
Google Drive (PDFs)
    |
    v
Python Agent (agent.py) ---> Claude API (extracts structured fields)
    |
    v
PostgreSQL Database (cases table)
    |
    v
Export Script (export_to_frontend.py) ---> generatedCases.json
    |
    v
React Frontend (static JSON import at build time)
```

1. **Source documents** — Complaint filings, consent orders, compliance decisions, and penalty notices are collected from regulator websites and stored in [Google Drive](https://drive.google.com/drive/folders/1j3XpwO0N2ttEjjVin-x-pHpq3KT3gwYj), organized by jurisdiction
2. **PDF processing** — `files/agent.py` watches an inbox folder, extracts text from PDFs, and sends them to the Claude API with a structured extraction prompt
3. **Claude extraction** — Claude parses each legal document and returns structured fields: company name, jurisdiction, violation types, legal bases, fines, impacted individuals, claims vs reality, regulatory findings, and more
4. **Database storage** — Extracted data is stored in PostgreSQL with the full JSON payload
5. **Frontend export** — `files/export_to_frontend.py` reads the database, calculates derived fields (severity scores, fine displays), and exports everything to `src/data/generatedCases.json`
6. **Static frontend** — The React app imports the JSON at build time. No runtime API calls or database connections

### Severity Score

Each case gets a deterministic severity rating (1-5) based on:
- **Data sensitivity (1-3):** Health/biometric/children/financial = 3, Location/identity/credit = 2, Everything else = 1
- **People impacted (0-2):** 1M+ = 2, 10K-999K = 1, <10K or unknown = 0
- **Final score** = data + people, clamped to [1, 5]

---

## Pages

| Page | Route | Description |
|------|-------|-------------|
| **Cases** | `/` | Searchable, filterable grid of all 771 cases with jurisdiction, sector, violation type, and sort controls |
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
- **Python 3** — Scripting language
- **Anthropic SDK** — Claude API for PDF extraction
- **PostgreSQL** + **psycopg2** — Database
- **Watchdog** — File system watcher for inbox processing
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
│   │   ├── generatedCases.json   # 771 cases exported from PostgreSQL
│   │   ├── jurisdictionInfo.ts   # Jurisdiction metadata (laws, authorities)
│   │   └── glossary.ts           # Learn page glossary content
│   ├── hooks/                    # Custom React hooks
│   ├── lib/utils.ts              # Tailwind class merge utility
│   ├── main.tsx                  # App entry point
│   └── index.css                 # Global styles and CSS variables
├── files/                        # Data pipeline (Python)
│   ├── agent.py                  # PDF → Claude API → PostgreSQL
│   ├── export_to_frontend.py     # PostgreSQL → generatedCases.json
│   ├── fill_case_source_url.py   # Enrich cases with source URLs
│   ├── fill_company_worth.py     # Enrich cases with company valuations
│   ├── revise_what_why.py        # Refine case descriptions via Claude
│   ├── reset_and_run.py          # Reset DB and reprocess all PDFs
│   ├── run_subset.py             # Process a subset for testing
│   ├── queries.sql               # Example SQL queries
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # Environment variable template
│   └── inbox/                    # PDF drop folders by jurisdiction
│       ├── Australia - OAIC/
│       ├── EU/GDPR/
│       ├── Singapore - PDPC/
│       ├── UK - ICO/
│       └── US FTC/
├── scripts/
│   └── ingest-drive.mjs          # Google Drive → generatedCases.json
├── public/
│   ├── logos/                    # Jurisdiction logos
│   ├── CNAME                     # Custom domain config
│   └── favicon.svg
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

### Data Pipeline (optional)

Only needed if you want to process new PDFs or rebuild the dataset.

```sh
cd files
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Anthropic API key and PostgreSQL connection string
```

**Process PDFs:**
```sh
python agent.py              # Watches inbox/ for new PDFs
```

**Export to frontend:**
```sh
python export_to_frontend.py  # Writes src/data/generatedCases.json
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key for PDF extraction |
| `DATABASE_URL` | PostgreSQL connection string |
| `MAX_PDFS` | Limit PDFs processed per run (default: 10) |
| `WATCH_DIR` | Custom inbox directory path |
| `DONE_DIR` | Custom processed directory path |
| `ERROR_DIR` | Custom error directory path |

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
