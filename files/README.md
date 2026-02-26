# Privacy Case PDF Agent

Agent that watches a folder for PDFs, sends them to **Claude** for structured extraction (Solove taxonomy, enforcement pyramid, legal bases, etc.), and stores results in **PostgreSQL**.

## How it works

1. **Agent starts** → creates `inbox/`, `processed/`, `errors/` under this folder and initialises the DB schema.
2. **On startup** it processes any PDFs already sitting in `inbox/`.
3. It then **watches `inbox/` continuously** — drop a PDF in, it’s picked up within ~1 second.
4. **Claude** extracts all 10 fields (Solove taxonomy, enforcement pyramid, legal bases, etc.).
5. **Result is saved to PostgreSQL**; file moves to `processed/`.
6. If something fails (bad PDF, API error, unparseable JSON), the file moves to **`errors/`** and is logged.

## Folder layout (under `files/`)

```
files/
  inbox/        ← drop PDFs here
  processed/    ← successfully processed PDFs
  errors/       ← failed PDFs (with logs)
  agent.py
  agent.log
  .env
```

## Setup

1. Copy `.env.example` to `.env` and set:
   - `ANTHROPIC_API_KEY` (Claude API)
   - `DATABASE_URL` (PostgreSQL)
2. Create the DB, e.g. `createdb privacy_cases`
3. Install deps: `pip install -r requirements.txt`
4. Run: `python agent.py` (from this directory or project root: `python files/agent.py`)

## Extracted fields

- case_name, jurisdiction, year, company, sector, data_types  
- summary  
- violation_type (Solove taxonomy), violation_notes  
- legal_bases_violated, enforcement_outcomes (pyramid)  
- penalty_amount_usd, penalty_original, individuals_affected, outcome  

See `queries.sql` for example queries against the `cases` table.
