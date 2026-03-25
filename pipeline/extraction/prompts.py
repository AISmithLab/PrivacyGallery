"""Prompt templates for Phase 1 (extraction) and Phase 2 (enrichment)."""

SYSTEM_PROMPT = """You are a legal research assistant specialising in privacy law and data \
protection enforcement cases. You extract structured information from legal documents, \
regulatory decisions, and enforcement notices with precision.

Always return ONLY a valid JSON object — no markdown, no explanation, no preamble."""

# ── Phase 1: Document Extraction ─────────────────────────────────────────────
# Extracts structured fields that are directly present in the document text.

PHASE1_PROMPT = """Analyse this legal/regulatory document text and extract the following fields.
Return ONLY a valid JSON object with exactly these keys.

IMPORTANT: Do not leave null for fine, num impacted, or severity if you can infer from the document. Use an estimate or "Unknown" so the UI is never blank.

Use "penalty_total_display" for the total fine only (e.g. "€1,380,000" or "$520,000") — no breakdown by article. If no monetary fine, use null for penalty fields and set outcome_summary_short (e.g. "Consent order", "Complaint Filed", "No penalty").

{{
  "case_name":              "Official case name or docket number (string or null)",
  "jurisdiction":           "e.g. EU/GDPR, USA/FTC, California/CCPA, UK/ICO, Singapore/PDPA (string)",
  "year":                   "Year of decision/enforcement action (integer or null)",
  "company":                "CRITICAL: Use ONLY the short, recognizable company name that a normal person would know. Strip ALL legal suffixes (Inc., LLC, Ltd., Corp., Pte., GmbH, etc.). Do NOT list related entities, subsidiaries, or alternate names — put those in summary instead. Examples: 'Meta' not 'Meta Platforms, Inc.', 'Uber' not 'Uber Technologies, Inc.', 'RivX Automation' not 'RivX Automation Corp. (and related entities: RivX Trucking LLC, ...)'. (string)",
  "sector":                 "Industry sector based on the company's PRIMARY business activity. Must be one of: 'Technology', 'Social Media', 'Healthcare', 'E-Commerce', 'Gaming', 'Finance', 'Advertising', 'Food Delivery', 'Hospitality', 'Retail', 'Transportation'. Choose based on what the company actually DOES, not the type of violation. A trucking company is 'Transportation', a hospital is 'Healthcare', a bank is 'Finance'. (string)",
  "data_types":             "Types of personal data involved — e.g. health data, location, financial, biometric (string)",

  "summary":                "2-3 sentence plain-English summary of what went wrong (string)",

  "violation_type":         "Primary category from Solove Privacy Taxonomy (string). Must be one of:
                               'Information Collection – Surveillance',
                               'Information Collection – Interrogation',
                               'Information Processing – Aggregation',
                               'Information Processing – Identification',
                               'Information Processing – Insecurity',
                               'Information Processing – Secondary Use',
                               'Information Processing – Exclusion',
                               'Information Dissemination – Breach of Confidentiality',
                               'Information Dissemination – Disclosure',
                               'Information Dissemination – Exposure',
                               'Information Dissemination – Increased Accessibility',
                               'Information Dissemination – Blackmail',
                               'Information Dissemination – Appropriation',
                               'Information Dissemination – Distortion',
                               'Invasion – Intrusion',
                               'Invasion – Decisional Interference'",

  "violation_notes":        "Brief explanation of why this Solove category applies (string)",

  "legal_bases_violated":   ["Array of specific provisions — e.g. 'GDPR Art. 5(1)(f)', 'FTC Act Section 5'"],

  "enforcement_outcomes":   ["Array — only include applicable items from:
                               'Monetary Penalty',
                               'Compliance Order',
                               'Processing Restriction',
                               'Structural Reform',
                               'Monitoring',
                               'Criminal Referral'"],

  "penalty_amount_usd":     "Monetary penalty normalised to USD (number or null). If no fine, use null.",
  "penalty_original":       "Penalty in original currency as stated (string or null). If no fine, use null.",
  "penalty_total_display":  "Total fine only — e.g. '€1,380,000'. If no monetary fine, use null.",

  "individuals_affected":   "Number of individuals affected (integer). CRITICAL: Estimate from document context when not explicitly stated — e.g. if '669 subscribers' are mentioned, use 669. Look for phrases like 'approximately X users', 'X consumers', 'X individuals'. Use 0 only if there is truly no way to estimate.",

  "legal_findings":         "Array of {{ \\"act\\": \\"What the law/article requires\\", \\"violations\\": [\\"How this company specifically violated it\\"] }}.",

  "outcome":                "Description of the final resolution and any remediation required (string)",
  "outcome_summary_short":  "CRITICAL: When there is NO monetary fine, you MUST set this to a 1-2 word label describing the outcome. Use exactly one of: 'Consent Order', 'Compliance Order', 'Complaint Filed', 'Settlement', 'Warning', 'Reprimand', 'No Penalty', 'Injunction', 'Ban Order'. NEVER leave empty when there is no fine — this drives the UI badge. When there IS a monetary fine, use null.",
  "severity_1_to_5":        "Severity of harm to individuals (integer 1-5). Weight by data type sensitivity, number impacted, and nature of violations."
}}

If a field cannot be determined from the document, use null.
For arrays, use an empty array [] if nothing applies.

--- DOCUMENT TEXT ---
{document_text}
"""

# ── Phase 2: AI Enrichment ───────────────────────────────────────────────────
# Uses Phase 1 extracted data + document text + outside knowledge to fill
# company context, narratives, and impact estimates.

PHASE2_PROMPT = """You have extracted case data and the original document text for a privacy enforcement case.
Use BOTH the document text and your knowledge of the company to fill in these enrichment fields.

CRITICAL RULES:
1. "what_they_did" and "why_they_were_wrong" MUST each be a complete sentence, max 195 characters, ending in . or ? or !
2. "why_they_were_wrong" MUST describe real-world harm or exposure caused by THIS company — NOT describe what a law says. NEVER write "Section X requires..." or "The Act prohibits...". Instead write what happened to real people.
3. For company_worth, use your knowledge of well-known companies (e.g. Meta=~$1.5T, Google=~$2T). Use parent/subsidiary valuation when the entity itself is private. Use "Unknown" only if truly obscure.
4. For founding_year: ALWAYS try to find this. Use your knowledge of the company. Search for incorporation dates, first product launch, or founding announcements. Only use null if the company is completely obscure with no public history.
5. For sector_corrected: Verify the Phase 1 sector is correct based on the company's PRIMARY business. A trucking company should be "Transportation" not "Technology". A hospital should be "Healthcare". A bank should be "Finance". Only return a correction if the Phase 1 sector is wrong.
6. For impacted_individuals_estimate: ALWAYS try to estimate. Use document clues (subscriber counts, user base, affected records). Use your knowledge of the company's user base if the document doesn't specify. Only use null if completely impossible to estimate.
7. For outcome_summary_short: If Phase 1 left this empty AND there is no monetary fine, you MUST provide one. Use: 'Consent Order', 'Compliance Order', 'Complaint Filed', 'Settlement', 'Warning', 'Reprimand', 'Injunction', 'Ban Order', or 'No Penalty'.

Return ONLY a valid JSON object:
{{
  "what_they_did":             "One complete sentence describing the company's action. Max 195 chars.",
  "why_they_were_wrong":       "One complete sentence describing real harm to people — company-specific, no law quotes. Max 195 chars.",
  "company_synopsis":          "Brief company description (1-2 sentences)",
  "company_long_description":  "Longer company description (2-4 sentences)",
  "company_worth":             "Market cap or valuation e.g. '$24B', '€500M', '$1.7T'. 'Unknown' only if obscure.",
  "founding_year":             "Year company was founded (integer). CRITICAL: Use your knowledge — search for incorporation dates, first products, founding history. Do NOT leave null for known companies.",
  "company_now":               "Brief status of the company today (1-2 sentences, or null)",
  "impacted_individuals_estimate": "Estimated number of impacted individuals (integer). CRITICAL: Always estimate — use document clues or your knowledge of the company's scale. Use 0 only if truly impossible.",
  "sector_corrected":          "Only set this if Phase 1 sector is WRONG. Must be one of: 'Technology', 'Social Media', 'Healthcare', 'E-Commerce', 'Gaming', 'Finance', 'Advertising', 'Food Delivery', 'Hospitality', 'Retail', 'Transportation'. null if Phase 1 sector is correct.",
  "outcome_summary_short":     "If there is no monetary fine AND Phase 1 left this empty: provide 1-2 word outcome label (e.g. 'Consent Order', 'Complaint Filed'). null if Phase 1 already set it or if there is a fine.",
  "claims_vs_reality":         "Array of {{ \\"claim\\": \\"What the company claimed\\", \\"reality\\": \\"What was actually true\\" }}"
}}

--- PHASE 1 EXTRACTED DATA ---
Company: {company}
Jurisdiction: {jurisdiction}
Year: {year}
Sector: {sector}
Summary: {summary}
Penalty: {penalty}
Individuals affected: {individuals}
Outcome summary: {outcome_summary}

--- DOCUMENT TEXT (excerpt) ---
{document_excerpt}
"""

# Version tags for tracking prompt changes in extraction_runs
PHASE1_VERSION = "v2.1"
PHASE2_VERSION = "v2.1"
