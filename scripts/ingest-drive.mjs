#!/usr/bin/env node
/**
 * Ingest privacy legal cases from data/drive (downloaded from Google Drive).
 * Writes src/data/generatedCases.json for the app to consume.
 *
 * Usage: node scripts/ingest-drive.mjs
 * Set DRIVE_DATA_PATH to override data/drive (e.g. path to extracted Drive folder).
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DRIVE_PATH = process.env.DRIVE_DATA_PATH || path.join(PROJECT_ROOT, "data", "drive");
const OUT_PATH = path.join(PROJECT_ROOT, "src", "data", "generatedCases.json");

const FOLDER_TO_JURISDICTION = {
  "Australia - OAIC": "Australia OAIC",
  California_DOJ: "California DOJ",
  EU: "EU GDPR",
  "Singapore - PDPC": "Singapore PDPC",
  "UK - ICO": "UK ICO",
  "US FTC": "US FTC",
};

const JURISDICTIONS = new Set(Object.values(FOLDER_TO_JURISDICTION));
const SECTORS = ["Technology", "Social Media", "Healthcare", "E-Commerce", "Gaming", "Finance", "Advertising", "Food Delivery", "Hospitality", "Retail", "Transportation"];
const VIOLATION_TYPES = [
  "Misrepresentation of practices",
  "Failure to disclose practices",
  "Health breach notification failure",
  "Excessive retention of childrens data",
  "Failure of parent control over childrens data",
  "Failure to obtain parental consent",
];

function defaultCase(overrides = {}) {
  return {
    id: "",
    company: "Unknown",
    companyDescription: "",
    companyLongDescription: "",
    caseDescription: "",
    country: "",
    sector: "Technology",
    foundingYear: 0,
    companyWorth: "",
    jurisdiction: "US FTC",
    fineAmount: 0,
    fineDisplay: "",
    violationSummary: "",
    violations: [],
    severityForIndividuals: 3,
    impactedPopulation: 0,
    impactedIndividuals: "",
    year: new Date().getFullYear(),
    complaintYear: new Date().getFullYear(),
    views: 0,
    whatTheyDid: "",
    whyTheyWereWrong: "",
    claimsVsReality: [],
    regulatoryFindings: [],
    outcome: "",
    consequences: "",
    companyNow: "",
    attachedPDFs: [],
    dataType: undefined,
    legalBasisViolated: [],
    enforcementStrategy: [],
    ...overrides,
  };
}

const ENFORCEMENT_KEYWORDS = [
  { key: "Monetary penalty", re: /\b(fine|penalty|settlement|pay\s+\$|€|£|\d+\s*(million|billion|m|b))\b/i },
  { key: "Compliance order", re: /\b(order|consent decree|injunction|comply|remedy)\b/i },
  { key: "Processing restriction", re: /\b(cease|stop|suspend|restrict\s+processing|ban)\b/i },
  { key: "Structural reform", re: /\b(restructure|privacy\s+program|comprehensive\s+program)\b/i },
  { key: "Monitoring", re: /\b(monitor|audit|assessment|independent\s+review)\b/i },
  { key: "Criminal referral", re: /\b(criminal|referr?ed\s+to\s+(doj|prosecutor))\b/i },
];
const LEGAL_BASIS_PATTERNS = [
  /\bGDPR\s+Art\.?\s*(\d+(?:\(\d+\))?)/gi,
  /\bFTC\s+(?:Act\s+)?§?\s*5|Section\s+5\s+of\s+the\s+FTC\s+Act/gi,
  /\bCCPA\s*§?\s*1798\.\d+/gi,
  /\bCOPPA\b/gi,
  /\bPDPA\b/gi,
];

/** Jurisdiction-specific: phrases that indicate a violation type (conceptual, cross-jurisdiction). */
const JURISDICTION_VIOLATION_PHRASES = {
  "US FTC": [
    ["misrepresent", "Misrepresentation of practices"],
    ["deceptive", "Misrepresentation of practices"],
    ["false or misleading", "Misrepresentation of practices"],
    ["failure to disclose", "Failure to disclose practices"],
    ["failed to disclose", "Failure to disclose practices"],
    ["did not disclose", "Failure to disclose practices"],
    ["without disclosing", "Failure to disclose practices"],
    ["children's data", "Failure to obtain parental consent"],
    ["children under 13", "Failure to obtain parental consent"],
    ["parental consent", "Failure to obtain parental consent"],
    ["COPPA", "Failure to obtain parental consent"],
    ["health breach", "Health breach notification failure"],
    ["breach notification", "Health breach notification failure"],
  ],
  "California DOJ": [
    ["misrepresent", "Misrepresentation of practices"],
    ["failure to disclose", "Failure to disclose practices"],
    ["CCPA", "Failure to disclose practices"],
    ["opt-out", "Failure to disclose practices"],
    ["sell.*personal information", "Failure to disclose practices"],
  ],
  "UK ICO": [
    ["unlawful processing", "Misrepresentation of practices"],
    ["fairness", "Misrepresentation of practices"],
    ["transparency", "Failure to disclose practices"],
    ["lawful basis", "Misrepresentation of practices"],
    ["consent", "Failure to obtain parental consent"],
    ["children", "Excessive retention of childrens data"],
  ],
  "EU GDPR": [
    ["Art\.?\s*5", "Misrepresentation of practices"],
    ["lawfulness.*processing", "Misrepresentation of practices"],
    ["purpose limitation", "Failure to disclose practices"],
    ["transparency", "Failure to disclose practices"],
    ["data subject", "Failure to disclose practices"],
    ["appropriate safeguards", "Failure to disclose practices"],
    ["transfer.*third count", "Failure to disclose practices"],
    ["consent", "Failure to obtain parental consent"],
    ["Article 32", "Failure to disclose practices"],
  ],
  "EU EDPB": [
    ["Art\.?\s*5", "Misrepresentation of practices"],
    ["transfer", "Failure to disclose practices"],
    ["safeguards", "Failure to disclose practices"],
  ],
  "Australia OAIC": [
    ["APP 1", "Failure to disclose practices"],
    ["APP 3", "Failure to obtain parental consent"],
    ["open and transparent", "Failure to disclose practices"],
    ["misleading", "Misrepresentation of practices"],
  ],
  "Singapore PDPC": [
    ["PDPA", "Failure to disclose practices"],
    ["consent", "Failure to obtain parental consent"],
  ],
};

/** Legal basis patterns per jurisdiction (doctrinal). */
const JURISDICTION_LEGAL_PATTERNS = {
  "US FTC": [
    /\bFTC\s+Act\s+§?\s*5|Section\s+5\s+of\s+the\s+FTC\s+Act/gi,
    /\bCOPPA\b/gi,
    /\b15\s+U\.?S\.?C\.?\s*§?\s*45/gi,
  ],
  "California DOJ": [/\bCCPA\b/gi, /\b§\s*1798\.\d+/gi, /\bCal\.?\s+Civil\s+Code/gi],
  "UK ICO": [/\bUK\s+GDPR\b/gi, /\bDPA\s+2018\b/gi, /\bData\s+Protection\s+Act/gi],
  "EU GDPR": [/\bGDPR\s+Art\.?\s*\d+(?:\(\d+\))?/gi, /\bArticle\s+\d+(?:\(\d+\))?\s+of\s+the\s+GDPR/gi],
  "EU EDPB": [/\bGDPR\s+Art\.?\s*\d+(?:\(\d+\))?/gi],
  "Australia OAIC": [/\bPrivacy\s+Act\b/gi, /\bAPP\s+\d+/gi],
  "Singapore PDPC": [/\bPDPA\b/gi],
};

function extractOutcomeAndConsequences(text) {
  const outcome = [];
  const consequences = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  const outcomeKeywords = /\b(order|ordered|fine|fined|penalty|settlement|imposed|required to|agreed to|enjoin|injunction|consent decree|remedy|cease|disgorge|refund|civil penalty)/i;
  for (const s of sentences) {
    if (outcomeKeywords.test(s) && s.length > 40 && s.length < 800) {
      if (/\b(required to|must|shall|agreed to|consent decree|injunction)\b/i.test(s)) consequences.push(s.trim());
      else outcome.push(s.trim());
    }
  }
  return {
    outcome: outcome.slice(0, 5).join(" ").slice(0, 2000) || "",
    consequences: consequences.slice(0, 8).join(" ").slice(0, 2000) || "",
  };
}

function extractClaimsVsReality(text) {
  const pairs = [];
  const claimRe = /(?:claimed|represented|stated|asserted|alleged|represented to consumers?)\s+(?:that\s+)?([^.]{20,300}?)(?=\.\s+(?:However|In fact|Actually|The (?:Commission|Court|FTC|DPC|ICO)|Nevertheless|But\s+))/gi;
  const realityRe = /(?:However|In fact|Actually|The (?:Commission|Court|FTC|DPC|ICO) found)\s+([^.]{20,400}?)(?=\.)/gi;
  let m;
  claimRe.lastIndex = 0;
  while ((m = claimRe.exec(text)) !== null) {
    const claim = m[1].trim().replace(/\s+/g, " ");
    if (claim.length < 15) continue;
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 600);
    const realityMatch = realityRe.exec(after);
    realityRe.lastIndex = 0;
    const reality = realityMatch ? realityMatch[1].trim().replace(/\s+/g, " ") : "See decision for findings.";
    pairs.push({ claim: claim.slice(0, 500), reality: reality.slice(0, 600) });
    if (pairs.length >= 5) break;
  }
  if (pairs.length === 0) {
    const alt = text.match(/(?:Commission|Court|DPC|ICO)\s+found\s+that\s+([^.]{30,400})/gi);
    if (alt && alt.length > 0) {
      for (let i = 0; i < Math.min(3, alt.length); i++) {
        const found = alt[i].replace(/^.*found\s+that\s+/i, "").trim().slice(0, 400);
        pairs.push({ claim: "Conduct at issue.", reality: found });
      }
    }
  }
  return pairs;
}

async function readPdfText(filePath) {
  try {
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);
    const { stdout } = await execFileAsync("pdftotext", ["-layout", "-enc", "UTF-8", filePath, "-"], { encoding: "utf8", timeout: 15000, maxBuffer: 10 * 1024 * 1024 });
    if (stdout && stdout.trim()) return stdout;
  } catch {
    // pdftotext not available or failed
  }
  try {
    const { getDocumentProxy, extractText } = await import("unpdf");
    const buf = await fs.readFile(filePath);
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    return text || "";
  } catch {
    return "";
  }
}

function extractFromText(text, jurisdiction) {
  const c = defaultCase({ jurisdiction });
  const upper = text.toUpperCase();

  // Company name: common patterns
  const companyMatch = text.match(/(?:company|entity|respondent|defendant|organisation|organization)[:\s]+([^\n\.]+)/i)
    || text.match(/(?:re\s*:\s*|in\s+the\s+matter\s+of\s+)([^\n\.]+)/i);
  if (companyMatch) c.company = companyMatch[1].trim().replace(/\s+/g, " ").slice(0, 120);

  // Fine / penalty (currency symbols and amounts)
  const fineMatch = text.match(/(?:fine|penalty|settlement|ordered to pay|pay\s+)[:\s]*([£$€]\s*[\d.,]+(?:\s*[BMK])?)/i)
    || text.match(/([£$€]\s*[\d.,]+(?:\s*[BMK])?)/);
  if (fineMatch) {
    const raw = fineMatch[1].replace(/\s/g, "");
    c.fineDisplay = raw;
    const num = raw.replace(/[£$€,\s]/g, "").toUpperCase();
    let amount = parseFloat(num) || 0;
    if (num.endsWith("B")) amount *= 1e9;
    else if (num.endsWith("M")) amount *= 1e6;
    else if (num.endsWith("K")) amount *= 1e3;
    c.fineAmount = Math.round(amount);
  }

  // Year (4 digits, plausible)
  const yearMatch = text.match(/(?:year|decided|decision|issued|dated)[:\s]*(\d{4})/i)
    || text.match(/\b(20\d{2}|19\d{2})\b/);
  if (yearMatch) {
    const y = parseInt(yearMatch[1], 10);
    if (y >= 1990 && y <= 2030) c.year = y;
  }

  // Violations: jurisdiction-aware phrases first, then generic VIOLATION_TYPES
  const violationSet = new Set();
  const jurPhrases = JURISDICTION_VIOLATION_PHRASES[jurisdiction] || [];
  for (const [phrase, violationType] of jurPhrases) {
    const re = /[.*+?^${}()|[\]\\]/.test(phrase)
      ? new RegExp(phrase, "i")
      : new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (re.test(text) && VIOLATION_TYPES.includes(violationType)) violationSet.add(violationType);
  }
  for (const v of VIOLATION_TYPES) {
    if (upper.includes(v.toUpperCase().replace(/\s+/g, " "))) violationSet.add(v);
  }
  c.violations = [...violationSet];

  // Legal basis violated: jurisdiction-specific patterns then generic
  const legalSet = new Set();
  const jurLegal = JURISDICTION_LEGAL_PATTERNS[jurisdiction];
  if (jurLegal) {
    for (const pattern of jurLegal) {
      let m;
      pattern.lastIndex = 0;
      while ((m = pattern.exec(text)) !== null) legalSet.add(m[0].trim());
    }
  }
  for (const pattern of LEGAL_BASIS_PATTERNS) {
    let m;
    pattern.lastIndex = 0;
    while ((m = pattern.exec(text)) !== null) legalSet.add(m[0].trim());
  }
  if (legalSet.size) c.legalBasisViolated = [...legalSet];

  // Number of individuals affected
  const impactedMatch = text.match(/(?:approximately\s+)?(\d+(?:\.\d+)?)\s*(million|billion|m|M|bn|B)\s*(?:users?|individuals?|people|consumers?|customers?)?/i)
    || text.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:million|billion|M\+?|B\+?)/i)
    || text.match(/(\d+)\s*(\+?)\s*(?:million|thousand)\s*(?:users?|individuals?|people)/i);
  if (impactedMatch) {
    let num = parseFloat(impactedMatch[1].replace(/,/g, ""));
    const mult = (impactedMatch[2] || "").toUpperCase();
    if (/M|MILLION/.test(mult)) num *= 1e6;
    else if (/B|BILLION/.test(mult)) num *= 1e9;
    else if (/K|THOUSAND/.test(mult)) num *= 1e3;
    if (num >= 1000) c.impactedIndividuals = num >= 1e9 ? (num / 1e9).toFixed(1) + "B+" : num >= 1e6 ? (num / 1e6).toFixed(1) + "M+" : num >= 1e3 ? (num / 1e3).toFixed(0) + "K+" : String(Math.round(num));
  }

  // Outcome and consequences
  const { outcome, consequences } = extractOutcomeAndConsequences(text);
  if (outcome) c.outcome = outcome;
  if (consequences) c.consequences = consequences;

  // Claims vs reality
  const claimsReality = extractClaimsVsReality(text);
  if (claimsReality.length) c.claimsVsReality = claimsReality;

  // Short descriptions: first paragraph or sentence
  const firstPara = text.split(/\n\n+/)[0] || text;
  if (firstPara.length > 50 && firstPara.length < 800) {
    c.caseDescription = firstPara.trim().slice(0, 1500);
    c.whatTheyDid = firstPara.trim().slice(0, 400);
    c.whyTheyWereWrong = firstPara.trim().slice(0, 400);
  }

  // Enforcement strategy (Ayres & Braithwaite pyramid)
  const strategySet = new Set();
  for (const { key, re } of ENFORCEMENT_KEYWORDS) {
    if (re.test(text)) strategySet.add(key);
  }
  if (strategySet.size) c.enforcementStrategy = [...strategySet];

  // Data type / context (Nissenbaum) heuristics
  if (/\b(health|medical|HIPAA|patient|clinical)\b/i.test(text)) c.dataType = "Health";
  else if (/\b(advertising|ad\s+tech|targeting|retargeting)\b/i.test(text)) c.dataType = "Advertising";
  else if (/\b(location|geolocation|GPS)\b/i.test(text)) c.dataType = "Location";
  else if (/\b(children|child|COPPA|minor)\b/i.test(text)) c.dataType = "Children's data";

  return c;
}

function normalizeJsonCase(obj, jurisdiction, index) {
  const c = defaultCase({
    id: String(index + 1),
    jurisdiction: JURISDICTIONS.has(obj.jurisdiction) ? obj.jurisdiction : jurisdiction,
  });
  if (obj.company) c.company = String(obj.company).trim();
  if (obj.year != null) c.year = Number(obj.year) || c.year;
  if (obj.fineAmount != null) c.fineAmount = Number(obj.fineAmount) || 0;
  if (obj.fineDisplay) c.fineDisplay = String(obj.fineDisplay);
  if (obj.whatTheyDid) c.whatTheyDid = String(obj.whatTheyDid);
  if (obj.whyTheyWereWrong) c.whyTheyWereWrong = String(obj.whyTheyWereWrong);
  if (obj.sector && SECTORS.includes(obj.sector)) c.sector = obj.sector;
  if (obj.impactedIndividuals) c.impactedIndividuals = String(obj.impactedIndividuals);
  if (Array.isArray(obj.violations)) {
    c.violations = obj.violations.filter((v) => VIOLATION_TYPES.includes(v));
  }
  if (obj.caseDescription) c.caseDescription = String(obj.caseDescription);
  if (obj.companyDescription) c.companyDescription = String(obj.companyDescription);
  if (obj.companyLongDescription) c.companyLongDescription = String(obj.companyLongDescription);
  if (obj.violationSummary) c.violationSummary = String(obj.violationSummary);
  if (obj.outcome) c.outcome = String(obj.outcome);
  if (obj.consequences) c.consequences = String(obj.consequences);
  if (obj.companyNow) c.companyNow = String(obj.companyNow);
  if (obj.country) c.country = String(obj.country);
  if (obj.foundingYear != null) c.foundingYear = Number(obj.foundingYear) || 0;
  if (obj.complaintYear != null) c.complaintYear = Number(obj.complaintYear) || c.year;
  if (obj.severityForIndividuals != null) c.severityForIndividuals = Math.min(5, Math.max(1, Number(obj.severityForIndividuals) || 3));
  if (obj.attachedPDFs && Array.isArray(obj.attachedPDFs)) c.attachedPDFs = obj.attachedPDFs;
  if (obj.claimsVsReality && Array.isArray(obj.claimsVsReality)) c.claimsVsReality = obj.claimsVsReality;
  if (obj.regulatoryFindings && Array.isArray(obj.regulatoryFindings)) c.regulatoryFindings = obj.regulatoryFindings;
  if (obj.dataType) c.dataType = String(obj.dataType);
  if (obj.legalBasisViolated && Array.isArray(obj.legalBasisViolated)) c.legalBasisViolated = obj.legalBasisViolated.map(String);
  if (obj.enforcementStrategy && Array.isArray(obj.enforcementStrategy)) c.enforcementStrategy = obj.enforcementStrategy.map(String);
  return c;
}

/** Parse a single line of CSV (handles quoted fields with commas). */
function parseCsvLine(line) {
  const out = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      field += ch;
    } else if (ch === ",") {
      out.push(field.trim());
      field = "";
    } else {
      field += ch;
    }
  }
  out.push(field.trim());
  return out;
}

/** Parse CSV file to array of row objects (header row = keys). */
function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    header.forEach((key, j) => {
      row[key] = values[j] !== undefined ? values[j] : "";
    });
    rows.push(row);
  }
  return rows;
}

function getRowVal(row, ...possibleKeys) {
  const lower = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]));
  for (const k of possibleKeys) {
    const v = lower[k.toLowerCase()];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}

/** Extract short company name from a long case title for display. */
function extractCompanyFromTitle(title) {
  const raw = String(title).trim();
  const intoMatch = raw.match(/Commissioner Initiated Investigation into\s+([^(]+?)\s*\(/i);
  if (intoMatch) return intoMatch[1].trim();
  const andMatch = raw.match(/(?:^|^'[^']+' and |^[^']+ and )([^(]+?)\s*\(Privacy\)/i);
  if (andMatch) return andMatch[1].replace(/^'|'$/g, "").trim();
  const entityMatch = raw.match(/^([^(]+?)\s*\(Privacy\)/);
  if (entityMatch) return entityMatch[1].trim();
  if (raw.length <= 80) return raw;
  return raw.slice(0, 77) + "…";
}

/** Build case from CSV row. Supports UK/ICO (case_title, case_url, pdf_url), OAIC (case_title, austlii_url, pdf_url), EU (Country, ETid, Source_URL, PDF_URL). */
function caseFromCsvRow(row, jurisdiction) {
  const c = defaultCase({ jurisdiction });
  const keys = Object.keys(row).map((k) => k.toLowerCase());
  if (keys.includes("case_title")) {
    const title = String(getRowVal(row, "case_title")).trim();
    if (!title) return null;
    c.company = extractCompanyFromTitle(title);
    c.caseDescription = title;
    const yearInTitle = title.match(/\b(20\d{2}|19\d{2})\b/);
    if (yearInTitle) {
      const y = parseInt(yearInTitle[1], 10);
      if (y >= 1990 && y <= 2030) {
        c.year = y;
        c.complaintYear = y;
      }
    }
    const pdfUrl = getRowVal(row, "pdf_url");
    const caseUrl = getRowVal(row, "case_url", "austlii_url");
    if (pdfUrl) c.attachedPDFs = [{ url: pdfUrl, label: "Decision" }];
    else if (caseUrl) c.attachedPDFs = [{ url: caseUrl, label: "Case" }];
  } else if (keys.includes("country") && (keys.includes("pdf_url") || keys.includes("source_url"))) {
    const country = String(getRowVal(row, "country")).trim();
    const etid = String(getRowVal(row, "etid")).trim();
    c.company = country && etid ? `${country} (${etid})` : country || etid || "EU case";
    c.caseDescription = c.company;
    const pdfUrl = getRowVal(row, "pdf_url", "source_url");
    if (pdfUrl) c.attachedPDFs = [{ url: pdfUrl, label: "Decision" }];
  } else {
    return null;
  }
  return c;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Fetch company description and founding year from Wikipedia (optional enrichment). */
async function fetchCompanyFromWikipedia(companyName) {
  if (!companyName || companyName === "Unknown") return {};
  const clean = companyName
    .replace(/,?\s*(Inc\.?|LLC|Ltd\.?|Pty\s+Ltd\.?|Corporation|Corp\.?|Co\.?|PLC|L\.?L\.?C\.?)$/i, "")
    .trim();
  const slug = encodeURIComponent(clean.replace(/\s+/g, " ").trim().replace(/ /g, "_"));
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, {
      headers: { "User-Agent": "PrivacyGallery-Ingest/1.0 (https://github.com/AISmithLab/PrivacyGallery)" },
    });
    if (!res.ok) return {};
    const data = await res.json();
    const extract = data.extract || "";
    if (!extract || data.type === "disambiguation") return {};
    let foundingYear = 0;
    const yearMatch = extract.match(/(?:founded|established|incorporated|created)\s+(?:in\s+)?(\d{4})/i)
      || extract.match(/(?:since|from)\s+(\d{4})/i)
      || extract.match(/\b(\d{4})\s+(?:company|founded)/i);
    if (yearMatch) foundingYear = parseInt(yearMatch[1], 10);
    let companyWorth = "";
    const worthMatch = extract.match(/(?:worth|valuation|market cap|revenue)[:\s]*\$?([\d.]+\s*[BMK]illion)/i);
    if (worthMatch) companyWorth = "$" + worthMatch[1].replace(/\s/g, "");
    return {
      companyDescription: extract.slice(0, 400),
      companyLongDescription: extract.slice(0, 1500),
      foundingYear: foundingYear >= 1800 && foundingYear <= 2030 ? foundingYear : 0,
      companyWorth: companyWorth || "",
    };
  } catch {
    return {};
  }
}

/** Recursively list all files under dirPath whose names match pattern. Returns paths relative to dirPath. */
async function listFilesRecursive(dirPath, pattern, base = "") {
  const entries = await fs.readdir(path.join(dirPath, base), { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) {
      const sub = await listFilesRecursive(dirPath, pattern, rel);
      files.push(...sub);
    } else if (e.isFile() && pattern.test(e.name)) {
      files.push(rel);
    }
  }
  return files;
}

async function processFile(filePath, jurisdiction, index) {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath, ext);

  if (ext === ".json") {
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    const list = Array.isArray(data) ? data : [data];
    return list.map((obj, i) => normalizeJsonCase(obj, jurisdiction, index + i));
  }

  if (ext === ".csv") {
    const raw = await fs.readFile(filePath, "utf-8");
    const rows = parseCsv(raw);
    const list = [];
    for (let i = 0; i < rows.length; i++) {
      const c = caseFromCsvRow(rows[i], jurisdiction);
      if (c) list.push(c);
    }
    return list.map((c, i) => ({ ...c, id: String(index + i + 1) }));
  }

  let text = "";
  if (ext === ".txt") {
    text = await fs.readFile(filePath, "utf-8");
  } else if (ext === ".pdf") {
    text = await readPdfText(filePath);
  } else {
    return [];
  }

  let c;
  if (text.trim()) {
    c = extractFromText(text, jurisdiction);
  } else {
    // No text (e.g. pdf-parse failed or PDF is image-only): create case from filename only
    c = caseFromPdfFilename(base, jurisdiction);
  }
  c.id = String(index + 1);
  if (c.company === "Unknown" || !c.company) c.company = base.replace(/[-_]/g, " ").trim().slice(0, 120) || "Unknown";
  return [c];
}

/** Build a case from a PDF filename when text extraction isn't available. Jurisdiction from folder; company from filename. */
function caseFromPdfFilename(baseName, jurisdiction) {
  const c = defaultCase({ jurisdiction });
  // Remove common suffixes: _complaint_1, __complaint_1, .pdf already stripped
  let name = baseName
    .replace(/_?complaint_?\d*$/i, "")
    .replace(/_+$/, "")
    .trim();
  // "Snapchat_ Inc._ In the Matter of" → take part before " In the Matter" or " In re" or " U.S. v" or " v."
  const matterMatch = name.match(/^(.+?)\s+(_|\s)(in\s+the\s+matter|in\s+re|u\.?s\.?\s*v\.?|v\.?\s+)/i);
  if (matterMatch) name = matterMatch[1].trim();
  // Replace underscores with spaces, collapse spaces, trim
  name = name.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  if (name.length > 120) name = name.slice(0, 117) + "…";
  c.company = name || "Unknown";
  c.caseDescription = c.company;
  // Year from filename if present (e.g. 2015 10-02, or 2020 in text)
  const yearMatch = baseName.match(/\b(20\d{2}|19\d{2})\b/);
  if (yearMatch) {
    const y = parseInt(yearMatch[1], 10);
    if (y >= 1990 && y <= 2030) c.year = y;
  }
  return c;
}

async function main() {
  const cases = [];
  let globalIndex = 0;

  try {
    const entries = await fs.readdir(DRIVE_PATH, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());

    const filePattern = /\.(json|txt|pdf|csv)$/i;

    for (const dir of dirs) {
      const jurisdiction = FOLDER_TO_JURISDICTION[dir.name];
      if (!jurisdiction) {
        console.warn(`Skipping unknown folder: ${dir.name}`);
        continue;
      }

      const dirPath = path.join(DRIVE_PATH, dir.name);
      const relativeFiles = await listFilesRecursive(dirPath, filePattern);
      relativeFiles.sort((a, b) => a.localeCompare(b));

      for (const rel of relativeFiles) {
        const filePath = path.join(dirPath, rel);
        const list = await processFile(filePath, jurisdiction, globalIndex);
        for (const c of list) {
          c.id = String(globalIndex + 1);
          globalIndex += 1;
          cases.push(c);
        }
      }
    }

    const WIKI_ENABLED = process.env.ENABLE_WIKI_LOOKUP === "1" || process.env.ENABLE_WIKI_LOOKUP === "true";
    const WIKI_LIMIT = Math.min(parseInt(process.env.WIKI_LOOKUP_LIMIT || "100", 10) || 100, 500);
    if (WIKI_ENABLED && cases.length > 0) {
      let enriched = 0;
      for (let i = 0; i < cases.length && enriched < WIKI_LIMIT; i++) {
        const c = cases[i];
        if (c.companyDescription) continue;
        const info = await fetchCompanyFromWikipedia(c.company);
        if (info.companyDescription) {
          c.companyDescription = info.companyDescription;
          if (info.companyLongDescription) c.companyLongDescription = info.companyLongDescription;
          if (info.foundingYear) c.foundingYear = info.foundingYear;
          if (info.companyWorth) c.companyWorth = info.companyWorth;
          enriched++;
          await sleep(400);
        }
      }
      if (enriched > 0) console.log(`Enriched ${enriched} cases with Wikipedia company info.`);
    }

    await fs.writeFile(OUT_PATH, JSON.stringify(cases, null, 2), "utf-8");
    console.log(`Wrote ${cases.length} cases to ${OUT_PATH}`);
  } catch (err) {
    if (err.code === "ENOENT") {
      console.error(`Drive data folder not found: ${DRIVE_PATH}`);
      console.error("Download the Drive folder and place it at data/drive/ (see data/drive/README.md)");
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

main();
