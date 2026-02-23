# Google Drive data for Privacy Jury

This folder should contain documents from the **privacy-legal-explorer** Google Drive:

**https://drive.google.com/drive/u/0/folders/1j3XpwO0N2ttEjjVin-x-pHpq3KT3gwYj**

## How to set up

1. Open the link above and sign in to Google if needed.
2. Download each jurisdiction folder, or the entire folder, to your computer.
3. Place the contents so that this directory looks like:

```
data/drive/
  Australia - OAIC/     (files here)
  California_DOJ/       (files here)
  EU/                   (files here)
  Singapore - PDPC/     (files here)
  UK - ICO/             (files here)
  US FTC/               (files here)
```

4. Supported file types:
   - **.csv** – case index (one case per row; columns like `case_title`, `pdf_url`). All jurisdiction folders and subfolders (e.g. EU) are scanned.
   - **.json** – structured case data (see schema below)
   - **.txt** – plain text; the script extracts company, fine, year, violations
   - **.pdf** – same as .txt if `pdf-parse` is installed (optional)

5. Run the ingest script from the project root:

```bash
npm run ingest-drive
```

or

```bash
node scripts/ingest-drive.mjs
```

This writes `src/data/generatedCases.json`. The app will use generated cases when the file contains a non-empty array; otherwise it falls back to the built-in static cases.

**To get your Drive cases on the site:** Run `npm run ingest-drive` (after placing the Drive folder here). Commit `src/data/generatedCases.json` so the site build includes it, or run the ingest step in your deployment pipeline.

**Optional – PDF parsing:** To extract text from PDFs, install `pdf-parse` and run the script again:

```bash
npm install pdf-parse
npm run ingest-drive
```

## Optional: JSON schema per case

If you add a `.json` file per case, use this shape (all fields optional except `company` and `jurisdiction`):

```json
{
  "company": "Company Name",
  "year": 2023,
  "jurisdiction": "UK ICO",
  "fineAmount": 12700000,
  "fineDisplay": "£12.7M",
  "whatTheyDid": "Short description.",
  "whyTheyWereWrong": "Short description.",
  "sector": "Social Media",
  "impactedIndividuals": "1.4M+",
  "violations": ["Failure to obtain parental consent"]
}
```

Jurisdiction must be one of: `"US FTC"`, `"California DOJ"`, `"UK ICO"`, `"Singapore PDPC"`, `"EU GDPR"`, `"EU EDPB"`, `"Australia OAIC"`.
