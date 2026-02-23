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
    ...overrides,
  };
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

  // Violations: look for known violation phrases
  for (const v of VIOLATION_TYPES) {
    if (upper.includes(v.toUpperCase().replace(/\s+/g, " "))) c.violations.push(v);
  }
  c.violations = [...new Set(c.violations)];

  // Short descriptions: first paragraph or sentence
  const firstPara = text.split(/\n\n+/)[0] || text;
  if (firstPara.length > 50 && firstPara.length < 800) {
    c.caseDescription = firstPara.trim().slice(0, 1500);
    c.whatTheyDid = firstPara.trim().slice(0, 400);
    c.whyTheyWereWrong = firstPara.trim().slice(0, 400);
  }

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
  return c;
}

async function readPdfText(filePath) {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const buf = await fs.readFile(filePath);
    const data = await pdfParse(buf);
    return data.text || "";
  } catch {
    return "";
  }
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

/** Build case from CSV row. Supports UK/ICO (case_title, case_url, pdf_url), OAIC (case_title, austlii_url, pdf_url), EU (Country, ETid, Source_URL, PDF_URL). */
function caseFromCsvRow(row, jurisdiction) {
  const c = defaultCase({ jurisdiction });
  const keys = Object.keys(row).map((k) => k.toLowerCase());
  if (keys.includes("case_title")) {
    const title = String(getRowVal(row, "case_title")).trim();
    if (!title) return null;
    c.company = title.length > 120 ? title.slice(0, 117) + "…" : title;
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

  if (!text.trim()) return [];
  const c = extractFromText(text, jurisdiction);
  c.id = String(index + 1);
  if (c.company === "Unknown") c.company = base.replace(/[-_]/g, " ").trim() || "Unknown";
  return [c];
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
