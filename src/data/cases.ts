export type ViolationType =
  | "Misrepresentation of practices"
  | "Failure to disclose practices"
  | "Health breach notification failure"
  | "Excessive retention of childrens data"
  | "Failure of parent control over childrens data"
  | "Failure to obtain parental consent";

export type Jurisdiction = "US FTC" | "California DOJ" | "UK ICO" | "Singapore PDPC" | "EU GDPR" | "EU EDPB" | "Australia OAIC";

export type Sector = "Technology" | "Social Media" | "Healthcare" | "E-Commerce" | "Gaming" | "Finance" | "Advertising" | "Food Delivery" | "Hospitality" | "Retail" | "Transportation";

export interface ClaimVsReality {
  claim: string;
  reality: string;
}

export interface RegulatoryFinding {
  act: string;
  description: string;
  violations: string[];
}

export interface EnforcementCase {
  id: string;
  company: string;
  companyDescription: string;
  companyLongDescription: string;
  caseDescription: string;
  country: string;
  sector: Sector;
  foundingYear: number;
  companyWorth: string;
  jurisdiction: Jurisdiction;
  fineAmount: number;
  fineDisplay: string;
  violationSummary: string;
  violations: ViolationType[];
  severityForIndividuals: number;
  impactedPopulation: number;
  impactedIndividuals: string;
  year: number;
  complaintYear: number;
  views: number;
  whatTheyDid: string;
  whyTheyWereWrong: string;
  claimsVsReality: ClaimVsReality[];
  regulatoryFindings: RegulatoryFinding[];
  outcome: string;
  consequences: string;
  companyNow: string;
  /** When no monetary fine: 1-2 word consequence (e.g. Consent order) for red card. */
  outcomeSummary?: string;
  /** URLs only (string[]) or objects with url + optional label (from Drive ingest). */
  attachedPDFs: (string | { url: string; label?: string })[];
  /** Data type / context (Nissenbaum contextual integrity), e.g. Health, Advertising, Location. */
  dataType?: string;
  /** Legal basis violated (doctrinal), e.g. "GDPR Art. 46(1)", "FTC Section 5", "CCPA §1798.120". */
  legalBasisViolated?: string[];
  /** Enforcement strategy (Ayres & Braithwaite pyramid), e.g. Monetary penalty, Compliance order, Processing restriction. */
  enforcementStrategy?: string[];
}

export const JURISDICTIONS: Jurisdiction[] = [
  "US FTC",
  "California DOJ",
  "UK ICO",
  "Singapore PDPC",
  "EU GDPR",
  "EU EDPB",
  "Australia OAIC",
];

export const VIOLATION_TYPES: ViolationType[] = [
  "Misrepresentation of practices",
  "Failure to disclose practices",
  "Health breach notification failure",
  "Excessive retention of childrens data",
  "Failure of parent control over childrens data",
  "Failure to obtain parental consent",
];

export const SECTORS: Sector[] = [
  "Technology",
  "Social Media",
  "Healthcare",
  "E-Commerce",
  "Gaming",
  "Finance",
  "Advertising",
  "Food Delivery",
  "Hospitality",
  "Retail",
  "Transportation",
];

/** Enforcement strategy (Ayres & Braithwaite responsive regulation pyramid). */
export const ENFORCEMENT_STRATEGIES = [
  "Monetary penalty",
  "Compliance order",
  "Processing restriction",
  "Structural reform",
  "Monitoring",
  "Criminal referral",
] as const;

/** Common legal bases (doctrinal variable); jurisdiction-dependent. */
export const LEGAL_BASIS_EXAMPLES = [
  "GDPR Art. 5",
  "GDPR Art. 6",
  "GDPR Art. 32",
  "GDPR Art. 46(1)",
  "FTC Act Section 5",
  "CCPA §1798.120",
  "PDPA (Singapore)",
  "COPPA",
] as const;

/** Short value only for company worth (e.g. "$18B"), to avoid elongated boxes. */
export function formatCompanyWorth(worth: string | undefined): string {
  if (!worth || !worth.trim()) return "Unknown";
  const w = worth.trim();
  const curSym = w.match(/([$€£])|(SGD\s*)/i);
  const sym = curSym ? (curSym[1] || (curSym[2]?.trim() + " ") || "") : "";
  const numMatch = w.match(/(\d[\d.,]*)\s*(B|M|K|billion|million|bn|m)?/i);
  if (numMatch) {
    const num = numMatch[1].replace(/\s/g, "");
    const suffix = (numMatch[2] || "").toUpperCase();
    if (/^B|BILLION|BN/.test(suffix)) return `${sym}${num}B`;
    if (/^M|MILLION/.test(suffix)) return `${sym}${num}M`;
    if (/^K/.test(suffix)) return `${sym}${num}K`;
    if (suffix) return `${sym}${num}${suffix.charAt(0)}`;
    return sym + num;
  }
  if (w.length <= 18) return w;
  return w.slice(0, 15) + "…";
}

/** Fine display: amount or "No fine". Use for Case Information / case page only. */
export function getFineDisplay(case_: EnforcementCase): string {
  if (case_.fineAmount && case_.fineAmount > 0) {
    return case_.fineDisplay || `$${case_.fineAmount.toLocaleString()}`;
  }
  const d = (case_.fineDisplay || "").trim();
  if (!d) return "No fine";
  if (/^[\d€£$SGD\s,.]+\d|^\d/.test(d) || d.includes("€") || d.includes("£") || d.includes("SGD")) return d;
  return "No fine";
}

/** Red stamp on card: amount, or 2-word consequence (e.g. Consent order) when no fine. */
export function getRedStampDisplay(case_: EnforcementCase): string {
  if (case_.fineAmount && case_.fineAmount > 0) {
    return case_.fineDisplay || `$${case_.fineAmount.toLocaleString()}`;
  }
  const d = (case_.fineDisplay || "").trim();
  if (d && (/^[\d€£$SGD\s,.]+\d|^\d/.test(d) || d.includes("€") || d.includes("£") || d.includes("SGD"))) return d;
  const summary = (case_.outcomeSummary || "").trim();
  if (summary) {
    const words = summary.split(/\s+/).slice(0, 2);
    const result = words.join(" ").replace(/;\s*$/, "").trim();
    return result || "No fine";
  }
  return "No fine";
}

/** Keep at most the first maxSentences sentences (default 4). Avoids splitting on abbreviations (e.g. U.S., EU-U.S.). */
export function truncateToMaxSentences(text: string, maxSentences = 4): string {
  if (!text || !text.trim()) return text;
  const trimmed = text.trim();
  // Split on . ! ? but not when period is part of abbreviation (e.g. U.S., EU-U.S.)
  const sentences = trimmed.split(/(?<=[.!?])(?<![A-Z]\.)\s+/).filter(Boolean);
  if (sentences.length <= maxSentences) return trimmed;
  return sentences.slice(0, maxSentences).join(" ").trim();
}

/** Strip common legal suffixes (Pte. Ltd., Ltd., Inc., LLC, etc.) unless they're part of the common name. */
function stripLegalSuffix(name: string): string {
  return name
    .replace(/,?\s+(Pte\.?\s*Ltd\.?|Ltd\.?|Limited|Inc\.?|LLC|L\.L\.C\.?|Corp\.?|Corporation|S\.A\.?|S\.L\.?|S\.L\.U\.?|GmbH|AG)\s*$/i, "")
    .trim();
}

/**
 * Extract a short company/organisation name for card and detail display.
 * Strips legal suffixes, d/b/a aliases, "and" second entities, and long case titles.
 */
export function getDisplayCompany(case_: EnforcementCase): string {
  let raw = case_.company || "";
  // "Commissioner Initiated Investigation into X (Privacy) ..." → X
  const intoMatch = raw.match(/Commissioner Initiated Investigation into\s+([^(]+?)\s*\(/i);
  if (intoMatch) return stripLegalSuffix(intoMatch[1].trim());
  // "'A' and B (Privacy) ..." or "A and B (Privacy) ..." → B (entity after "and")
  const andMatch = raw.match(/(?:^|^'[^']+' and |^[^']+ and )([^(]+?)\s*\(Privacy\)/i);
  if (andMatch) return stripLegalSuffix(andMatch[1].replace(/^'|'$/g, "").trim());
  // "X Pty Ltd (Privacy) ..." or "X Limited (Privacy) ..." → keep up to (Privacy)
  const entityMatch = raw.match(/^([^(]+?)\s*\(Privacy\)/);
  if (entityMatch) return stripLegalSuffix(entityMatch[1].trim());

  // Strip parenthetical aliases: (also doing business as X), (d/b/a X), (TURSS), etc.
  raw = raw
    .replace(/\s*\(also\s+(?:doing\s+business\s+as|d\/b\/a)\s+[^)]+\)/gi, "")
    .replace(/\s*\(d\/b\/a\s+[^)]+\)/gi, "")
    .replace(/\s*\([A-Z]{2,6}\)\s*(?=\s+and\s+)/gi, "")
    .replace(/\s*\([A-Z]{2,6}\)\s*$/g, "")
    .trim();

  // "X and Y" → take first entity (main name)
  const andIdx = raw.search(/\s+and\s+/i);
  if (andIdx > 0) raw = raw.slice(0, andIdx).trim();

  const shortened = stripLegalSuffix(raw);
  if (shortened.length <= 80) return shortened;
  return shortened.slice(0, 77) + "…";
}

/** True if "what they did" is substantive (not just company name, not truncated). */
export function isSubstantiveWhatTheyDid(case_: EnforcementCase): boolean {
  const text = (case_.whatTheyDid || "").trim();
  if (!text || text.length < 40) return false;
  const displayCompany = getDisplayCompany(case_);
  const company = (case_.company || "").trim();
  const norm = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  const normText = norm(text);
  const normCompany = norm(company);
  const normDisplay = norm(displayCompany);
  if (normText === normCompany || normText === normDisplay) return false;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 3 && normDisplay && normText.startsWith(normDisplay)) return false;
  const displayed = truncateToMaxSentences(text, 1);
  if (displayed.length < 40) return false;
  return true;
}

/** True if "why they were wrong" is substantive (not truncated or too short). */
export function isSubstantiveWhyTheyWereWrong(case_: EnforcementCase): boolean {
  const text = (case_.whyTheyWereWrong || "").trim();
  if (!text || text.length < 40) return false;
  const displayed = truncateToMaxSentences(text, 1);
  if (displayed.length < 40) return false;
  return true;
}

import generatedCases from "./generatedCases.json";

const staticCases: EnforcementCase[] = [
  {
    id: "1",
    company: "Snapchat",
    companyDescription: "A U.S.-based social media company that operates a messaging app where users share disappearing photos and videos.",
    companyLongDescription: "Snap Inc. is an American technology company, founded on September 16, 2011, by Evan Spiegel, Bobby Murphy, and Reggie Brown, based in Santa Monica, California. The company developed and maintains technological products and services, namely Snapchat, Spectacles, Bitmoji, and SnapBoost. The company was named Snapchat Inc. at its inception, but it was rebranded Snap Inc. on September 24, 2016.",
    caseDescription: "In 2014, the Federal Trade Commission charged Snapchat with deceiving consumers by promoting the ephemeral nature of its messaging service. The FTC found that Snapchat's core marketing promise—that photos and videos would 'disappear forever'—was false. Recipients could easily save snaps through third-party apps, screenshots that bypassed detection, or by accessing the device's file system. Furthermore, the company transmitted users' location data and contact lists without adequate disclosure, and its failure to secure the Find Friends feature led to a breach exposing 4.6 million usernames and phone numbers. This case was one of the first major FTC enforcement actions against a social media company for deceptive privacy practices and set an important precedent for how regulators evaluate 'disappearing' content claims.",
    country: "USA",
    sector: "Social Media",
    foundingYear: 2011,
    companyWorth: "$24B",
    jurisdiction: "US FTC",
    fineAmount: 0,
    fineDisplay: "Consent Order",
    violationSummary: "The company misrepresented the extent to which messages disappeared and failed to implement reasonable data security protections.",
    violations: ["Misrepresentation of practices", "Failure to disclose practices"],
    severityForIndividuals: 4,
    impactedPopulation: 5,
    impactedIndividuals: "4.6M+",
    year: 2014,
    complaintYear: 2013,
    views: 342,
    whatTheyDid: "Told users photos and videos would disappear forever and that screenshots would trigger notifications.",
    whyTheyWereWrong: "Snaps were stored unencrypted and easily retrievable. Screenshot detection could be bypassed on older devices.",
    claimsVsReality: [
      { claim: "Snaps 'disappear forever' after the timer expires.", reality: "The FTC found that snaps were stored unencrypted on the recipient's device and could be retrieved by connecting the phone to a computer or using widely available third-party apps like SnapHack. Even Snapchat's own screenshot detection was unreliable—on Android, recipients could simply disable it." },
      { claim: "Senders would be notified if recipients took a screenshot.", reality: "On Android devices running versions older than 4.1, the screenshot-detection mechanism failed entirely, meaning senders received no notification. Third-party apps also bypassed detection on all platforms, giving recipients a false sense of security." },
      { claim: "No location tracking by the Android app.", reality: "Despite the privacy policy stating that Snapchat did not track location, the Android app transmitted Wi-Fi-based and cell-tower-based location data to Snapchat's analytics tracking provider from January 2013 onward without any user disclosure." },
      { claim: "Find Friends used only phone/email/Facebook ID.", reality: "The app silently uploaded the user's entire address book—including names, phone numbers, and email addresses—to Snapchat's servers when using the Find Friends feature. This went far beyond the stated collection of just the user's own phone number or email." },
    ],
    regulatoryFindings: [
      {
        act: "FTC Act § 5(a), 15 U.S.C. § 45(a)",
        description: "No deceptive acts or practices in or affecting commerce (e.g. no false or misleading representations about product capabilities, data practices, or security).",
        violations: [
          "Claimed snaps 'disappear forever' after the timer; recipients could save them via file storage, third-party apps, or screenshots.",
          "Claimed senders would be notified if recipients took a screenshot; detection could be evaded on some devices.",
          "Claimed no location tracking; the Android app sent Wi-Fi and cell-based location to an analytics provider.",
          "Find Friends UI and policy implied only phone/email/Facebook ID were collected; the app collected the full address book without adequate notice.",
          "Claimed reasonable security measures; failed to verify phone numbers, limit API abuse, or prevent scraping—leading to exposure of 4.6M usernames and phone numbers.",
        ],
      },
    ],
    outcome: "There was no monetary penalty. The FTC imposed a compliance order (Part I) prohibiting Snapchat from misrepresenting the privacy, security, or confidentiality of covered information—including the extent of message deletion, ability to detect or notify about screenshots, categories of data collected, or safeguards in place.",
    consequences: "Snapchat was required to establish and maintain a comprehensive privacy program (Part II) with a designated lead, risk assessments, controls, vendor management, and periodic review. The order also required initial and biennial third-party assessments for 20 years (Part III), with the assessor approved by the FTC, and recordkeeping for 5 years of statements, complaints, compliance-related documents, and assessment materials (Part IV). The order runs until December 23, 2034, or 20 years from any subsequent FTC court complaint alleging a violation, whichever is later.",
    companyNow: "Snap Inc. continues to operate Snapchat with over 750 million monthly active users as of 2024. The company has significantly expanded its privacy and security teams and implemented the required comprehensive privacy program.",
    attachedPDFs: ["140508snapchatorder.pdf"],
  },
  {
    id: "2",
    company: "Epic Games",
    companyDescription: "Video game developer behind Fortnite and the Unreal Engine.",
    companyLongDescription: "Epic Games, Inc. is an American video game and software development company founded by Tim Sweeney in 1991. The company is headquartered in Cary, North Carolina. Epic Games develops the Unreal Engine, a commercially available game engine, and its subsidiary, Psyonix, develops Rocket League.",
    caseDescription: "The FTC brought two separate actions against Epic Games in December 2022, resulting in a combined $520 million settlement—the largest gaming privacy enforcement in history. The first action alleged Epic violated COPPA by collecting personal data from children under 13 playing Fortnite without obtaining parental consent, and by defaulting minors into real-time voice and text chat with strangers. The second action targeted Epic's use of 'dark patterns'—confusing button placements, intentionally misleading purchase flows, and a deliberately complex refund process—that tricked players of all ages into making unwanted purchases. The FTC demonstrated that Epic's item shop design was purposefully deceptive, with players frequently purchasing items accidentally when they only meant to preview them.",
    country: "USA",
    sector: "Gaming",
    foundingYear: 1991,
    companyWorth: "$32B",
    jurisdiction: "US FTC",
    fineAmount: 520000000,
    fineDisplay: "$520M",
    violationSummary: "Collected personal information from children under 13 without parental consent and used manipulative dark patterns to trick players into purchases.",
    violations: ["Failure to obtain parental consent", "Misrepresentation of practices"],
    severityForIndividuals: 4,
    impactedPopulation: 5,
    impactedIndividuals: "45M+",
    year: 2022,
    complaintYear: 2022,
    views: 1203,
    whatTheyDid: "Allowed children under 13 to play Fortnite without parental consent and designed confusing purchase flows.",
    whyTheyWereWrong: "Violated COPPA by collecting children's data and used dark patterns that led to thousands of accidental purchases.",
    claimsVsReality: [
      { claim: "Age-appropriate content and privacy protections for all users.", reality: "The FTC found that Epic knowingly allowed children under 13 to register for Fortnite accounts and defaulted all players—including minors—into open voice and text chat with strangers. Internal documents showed Epic employees raised concerns about child safety as early as 2017, but the company resisted adding parental controls because they feared it would reduce engagement metrics." },
      { claim: "In-app purchases require clear confirmation.", reality: "Epic's purchase flow used a single button press with no confirmation dialog, leading to thousands of accidental purchases. The 'preview' and 'purchase' buttons were placed in nearly identical positions across different screens, and the company actively resisted adding a purchase confirmation step despite internal data showing high rates of refund requests—many from parents of minor players." },
    ],
    regulatoryFindings: [
      {
        act: "COPPA Rule, 16 C.F.R. Part 312",
        description: "Children's Online Privacy Protection Act requirements for collecting data from children under 13.",
        violations: [
          "Collected personal information from children under 13 without obtaining verifiable parental consent.",
          "Enabled real-time voice and text communications for minors without parental consent.",
          "Used dark patterns to trick players into making unintended purchases.",
        ],
      },
    ],
    outcome: "Epic Games agreed to pay $520 million—$275 million in civil penalties for COPPA violations and $245 million in refunds to consumers affected by dark patterns.",
    consequences: "Epic must implement a comprehensive privacy program, obtain parental consent before collecting children's data, and disable voice/text chat for minors by default.",
    companyNow: "Epic Games continues to operate Fortnite with enhanced privacy settings, including parental controls and default-off communications for players under 18.",
    attachedPDFs: [],
  },
  {
    id: "3",
    company: "Meta Platforms",
    companyDescription: "Social media conglomerate operating Facebook, Instagram, and WhatsApp.",
    companyLongDescription: "Meta Platforms, Inc., formerly known as Facebook, Inc., is an American multinational technology conglomerate founded in 2004 by Mark Zuckerberg. Headquartered in Menlo Park, California, the company owns and operates Facebook, Instagram, WhatsApp, and Threads.",
    caseDescription: "In May 2023, Ireland's Data Protection Commission (DPC) imposed a record-breaking €1.2 billion fine on Meta for systematically transferring EU users' personal data to the United States in violation of GDPR. The case originated from a 2020 complaint filed following the Court of Justice of the European Union's Schrems II decision, which invalidated the EU-US Privacy Shield. Despite the ruling, Meta continued transferring data of approximately 390 million EU/EEA users to US servers where it was subject to US surveillance programs such as PRISM and UPSTREAM. The DPC found that Meta's reliance on Standard Contractual Clauses was insufficient because US law fundamentally undermined the protections those clauses were meant to provide.",
    country: "Ireland (EU)",
    sector: "Social Media",
    foundingYear: 2004,
    companyWorth: "$1.2T",
    jurisdiction: "EU GDPR",
    fineAmount: 1200000000,
    fineDisplay: "€1.2B",
    violationSummary: "Transferred EU user data to the US without adequate safeguards, violating GDPR's data transfer rules following the Schrems II ruling.",
    violations: ["Failure to disclose practices", "Misrepresentation of practices"],
    severityForIndividuals: 4,
    impactedPopulation: 5,
    impactedIndividuals: "390M+",
    year: 2023,
    complaintYear: 2020,
    views: 2841,
    whatTheyDid: "Continued transferring EU user data to US servers after the Privacy Shield framework was struck down.",
    whyTheyWereWrong: "390 million users' data was exposed to US surveillance programs with no adequate legal safeguards in place.",
    claimsVsReality: [
      { claim: "User data transfers to the US comply with GDPR requirements.", reality: "After the EU-US Privacy Shield was invalidated by the CJEU in July 2020, Meta continued transferring data of 390 million EU users to the US for nearly three years. Internal documents showed Meta was aware that its transfer mechanism lacked legal basis but continued the practice to avoid disrupting its advertising business model." },
      { claim: "Standard Contractual Clauses provide sufficient protection.", reality: "The DPC found that Meta's SCCs could not address the fundamental issue: US federal law (particularly Section 702 of FISA and Executive Order 12333) gave US intelligence agencies broad access to data held by US companies. No contractual clause could override these statutory surveillance powers, rendering Meta's safeguards effectively meaningless." },
    ],
    regulatoryFindings: [
      {
        act: "GDPR Article 46(1)",
        description: "Requirement for appropriate safeguards when transferring personal data to third countries.",
        violations: [
          "Transferred personal data of EU users to the United States without providing adequate safeguards.",
          "Continued reliance on Standard Contractual Clauses despite Schrems II ruling.",
        ],
      },
    ],
    outcome: "The Irish Data Protection Commission fined Meta €1.2 billion—the largest GDPR fine ever—and ordered the company to suspend data transfers to the US within 5 months.",
    consequences: "Meta was required to bring its data transfers into compliance with GDPR Chapter V within 6 months, including cessation of unlawful processing and storage of EU personal data in the US.",
    companyNow: "Meta has restructured its data transfer mechanisms following the adoption of the EU-US Data Privacy Framework in July 2023.",
    attachedPDFs: [],
  },
  {
    id: "4",
    company: "British Airways",
    companyDescription: "Major UK-based international airline carrier.",
    companyLongDescription: "British Airways is the flag carrier airline of the United Kingdom, headquartered in London. It is the largest airline in the UK based on fleet size and the second-largest based on passengers carried.",
    caseDescription: "Between June and September 2018, attackers compromised British Airways' website and mobile app by injecting malicious JavaScript code (a 'Magecart' attack) that redirected customer payment card details to a fraudulent website controlled by the attackers. Approximately 380,000 payment card transactions were compromised before the breach was detected. The ICO's investigation found that BA had failed to implement basic security measures including multi-factor authentication, timely software patching, and adequate network monitoring. The initial proposed fine of £183 million was reduced to £20 million, with the ICO citing BA's cooperation, financial impact of COVID-19, and the steps BA had already taken to improve security.",
    country: "UK",
    sector: "Transportation",
    foundingYear: 1974,
    companyWorth: "£5.8B",
    jurisdiction: "UK ICO",
    fineAmount: 20000000,
    fineDisplay: "£20M",
    violationSummary: "Failed to implement adequate security measures, leading to a cyberattack that compromised personal and financial data of 400,000 customers.",
    violations: ["Failure to disclose practices"],
    severityForIndividuals: 5,
    impactedPopulation: 4,
    impactedIndividuals: "400K+",
    year: 2020,
    complaintYear: 2018,
    views: 892,
    whatTheyDid: "Failed to implement basic security controls on their website and mobile payment pages.",
    whyTheyWereWrong: "Malicious code skimmed 380,000 card transactions for three months without detection due to missing MFA and monitoring.",
    claimsVsReality: [
      { claim: "Customer payment data is processed securely.", reality: "Attackers injected 22 lines of malicious JavaScript into BA's payment page that silently copied card details—including CVV codes—to a lookalike domain (baways.com). The skimming code ran undetected for 3 months, compromising an estimated 380,000 transactions. BA's security team had no monitoring in place to detect unauthorized script injections on payment pages." },
      { claim: "Robust cybersecurity measures protect personal data.", reality: "The ICO found that BA failed to implement even basic security controls: no multi-factor authentication for domain administrator accounts, no file integrity monitoring, outdated and unpatched software, no network segmentation, and inadequate logging. Many of these failures persisted despite BA being aware of similar attacks on other companies months earlier." },
    ],
    regulatoryFindings: [
      {
        act: "GDPR Article 5(1)(f) & Article 32",
        description: "Obligation to ensure appropriate security of personal data.",
        violations: [
          "Failed to implement appropriate technical and organisational measures to prevent unauthorized access.",
          "Did not detect the breach for over two months.",
        ],
      },
    ],
    outcome: "The UK ICO fined British Airways £20 million (reduced from initial £183 million due to COVID-19 impact).",
    consequences: "BA was required to implement enhanced security measures including multi-factor authentication and improved monitoring systems.",
    companyNow: "British Airways has invested significantly in cybersecurity infrastructure and established a dedicated data protection team.",
    attachedPDFs: [],
  },
  {
    id: "5",
    company: "SingHealth",
    companyDescription: "Singapore's largest public healthcare group operating hospitals and clinics.",
    companyLongDescription: "Singapore Health Services Pte Ltd (SingHealth) is the largest group of healthcare institutions in Singapore, comprising four hospitals, five national specialty centres, and eight polyclinics.",
    caseDescription: "In June-July 2018, Singapore experienced its worst-ever cyberattack when a sophisticated state-sponsored Advanced Persistent Threat (APT) group breached SingHealth's patient database and exfiltrated 1.5 million patient records, including the personal particulars and outpatient prescription details of Prime Minister Lee Hsien Loong. The attackers had been inside the network since August 2017, exploiting vulnerabilities in SingHealth's front-end workstations to move laterally through the network. A Committee of Inquiry found multiple failures in both SingHealth and its IT vendor IHiS, including inadequate staff training, failure to patch known vulnerabilities, and delayed incident response despite early warning signs being detected by a junior IT administrator.",
    country: "Singapore",
    sector: "Healthcare",
    foundingYear: 2000,
    companyWorth: "Public Entity",
    jurisdiction: "Singapore PDPC",
    fineAmount: 750000,
    fineDisplay: "S$750K",
    violationSummary: "Suffered the largest data breach in Singapore's history exposing 1.5 million patient records including the Prime Minister's prescription data.",
    violations: ["Failure to disclose practices"],
    severityForIndividuals: 5,
    impactedPopulation: 5,
    impactedIndividuals: "1.5M+",
    year: 2019,
    complaintYear: 2018,
    views: 1567,
    whatTheyDid: "Left critical systems unpatched and failed to act on early warning signs of a network intrusion.",
    whyTheyWereWrong: "Attackers accessed the network for ten months, exfiltrating 1.5 million patient records including the Prime Minister's prescriptions.",
    claimsVsReality: [
      { claim: "Patient records are protected by robust security systems.", reality: "The APT group maintained persistent access to SingHealth's network for approximately 10 months (August 2017 to July 2018). They exploited unpatched vulnerabilities in internet-facing workstations and used publicly available hacking tools to escalate privileges and move laterally through the network. A junior IT admin first noticed suspicious database queries in June 2018 but was told to 'continue monitoring'—delaying the response by over a month." },
      { claim: "Only authorized medical staff can access patient data.", reality: "The attackers compromised multiple administrator credentials, including a dormant service account with high-level database access that had never been reviewed or deactivated. Using these credentials, they ran bulk SQL queries against the patient database, exfiltrating 1.5 million records including the Prime Minister's personal prescription history—data that was specifically targeted." },
    ],
    regulatoryFindings: [
      {
        act: "Personal Data Protection Act 2012 (PDPA) — Section 24",
        description: "Obligation to protect personal data with reasonable security arrangements.",
        violations: [
          "Failed to implement adequate security measures to protect personal data in its possession.",
          "Delayed detection of the data breach for approximately 10 months.",
        ],
      },
    ],
    outcome: "The PDPC fined SingHealth S$250,000 and its IT vendor Integrated Health Information Systems (IHiS) S$750,000.",
    consequences: "A Committee of Inquiry was established, leading to 16 recommendations for improving cybersecurity in Singapore's healthcare sector.",
    companyNow: "SingHealth has implemented all 16 recommendations and established an enhanced cybersecurity framework with continuous monitoring.",
    attachedPDFs: [],
  },
  {
    id: "6",
    company: "Sephora",
    companyDescription: "Global beauty retailer selling cosmetics, skincare, and fragrances.",
    companyLongDescription: "Sephora is a French multinational retailer of personal care and beauty products founded in 1969, now owned by LVMH. It operates over 2,700 stores across 35 countries.",
    caseDescription: "In August 2022, the California Attorney General announced a $1.2 million settlement with Sephora in one of the first public enforcement actions under the California Consumer Privacy Act (CCPA). The AG's investigation found that Sephora was 'selling' consumers' personal information to third-party advertising and analytics companies—through tracking cookies and pixels—without disclosing this in its privacy policy or providing consumers with a 'Do Not Sell My Personal Information' link as required by law. Critically, Sephora also failed to honor Global Privacy Control (GPC) signals, which California treats as legally valid opt-out requests. This case was significant because it established that sharing consumer data with third-party trackers in exchange for analytics services constitutes a 'sale' under CCPA.",
    country: "USA",
    sector: "Retail",
    foundingYear: 1969,
    companyWorth: "€15B",
    jurisdiction: "California DOJ",
    fineAmount: 1200000,
    fineDisplay: "$1.2M",
    violationSummary: "Failed to disclose the sale of consumer personal information and did not process opt-out requests via Global Privacy Control signals.",
    violations: ["Failure to disclose practices", "Misrepresentation of practices"],
    severityForIndividuals: 3,
    impactedPopulation: 4,
    impactedIndividuals: "Unknown",
    year: 2022,
    complaintYear: 2022,
    views: 456,
    whatTheyDid: "Shared customer data with ad networks via tracking cookies while claiming not to sell personal information.",
    whyTheyWereWrong: "This constituted a 'sale' under CCPA, and the company ignored legally mandated opt-out signals from browsers.",
    claimsVsReality: [
      { claim: "We do not sell your personal information.", reality: "Sephora's website deployed dozens of third-party tracking technologies—including cookies and pixels from advertising networks—that transmitted detailed customer browsing behavior, purchase history, and device identifiers to companies like Google, Facebook, and data brokers. Under CCPA's broad definition, this data-for-services exchange constituted a 'sale,' yet Sephora's privacy policy explicitly denied selling consumer data." },
      { claim: "We respect your privacy choices.", reality: "When consumers sent legally-recognized Global Privacy Control (GPC) signals via their browsers, Sephora's systems simply ignored them and continued tracking. The AG's office tested this by visiting Sephora's website with GPC enabled and confirmed that tracking cookies continued to be set and data continued to flow to third parties—a direct violation of CCPA's opt-out requirements." },
    ],
    regulatoryFindings: [
      {
        act: "California Consumer Privacy Act (CCPA) — Cal. Civ. Code § 1798.100 et seq.",
        description: "Requirements for disclosing and allowing consumers to opt out of the sale of personal information.",
        violations: [
          "Failed to disclose to consumers that their personal information was being sold.",
          "Did not provide a 'Do Not Sell My Personal Information' link on its website.",
          "Failed to process opt-out requests via Global Privacy Control signals.",
        ],
      },
    ],
    outcome: "Sephora agreed to pay $1.2 million in penalties to the California Attorney General's office.",
    consequences: "Required to conform its online disclosures, provide opt-out mechanisms, and process GPC signals as valid opt-out requests.",
    companyNow: "Sephora has updated its privacy policy and now honors Global Privacy Control signals across its platforms.",
    attachedPDFs: [],
  },
  {
    id: "7",
    company: "Amazon Europe",
    companyDescription: "European arm of the global e-commerce and cloud computing giant.",
    companyLongDescription: "Amazon Europe Core S.à r.l. is the European headquarters of Amazon, based in Luxembourg. It processes personal data for hundreds of millions of EU customers across its e-commerce and digital services platforms.",
    caseDescription: "In July 2021, Luxembourg's Commission Nationale pour la Protection des Données (CNPD) imposed a €746 million fine on Amazon—at the time the largest GDPR penalty ever issued. The case originated from a 2018 complaint filed by French privacy advocacy group La Quadrature du Net on behalf of 10,000 individuals. The CNPD found that Amazon's advertising targeting system processed personal data without obtaining valid consent under GDPR, and that the company's privacy notices were insufficiently transparent about how user data was being used for behavioral advertising. Amazon has strongly contested the fine and filed an appeal, arguing that its data processing practices comply with GDPR requirements.",
    country: "Luxembourg (EU)",
    sector: "E-Commerce",
    foundingYear: 1994,
    companyWorth: "$1.9T",
    jurisdiction: "EU GDPR",
    fineAmount: 746000000,
    fineDisplay: "€746M",
    violationSummary: "Processed personal data for targeted advertising without valid consent from users, violating GDPR transparency and lawfulness requirements.",
    violations: ["Failure to obtain parental consent", "Misrepresentation of practices"],
    severityForIndividuals: 3,
    impactedPopulation: 5,
    impactedIndividuals: "300M+",
    year: 2021,
    complaintYear: 2018,
    views: 2105,
    whatTheyDid: "Enrolled users in behavioral advertising by default and buried consent in general terms of service.",
    whyTheyWereWrong: "Users had no meaningful way to understand or control how their data was combined into advertising profiles.",
    claimsVsReality: [
      { claim: "Advertising targeting is based on user consent.", reality: "The CNPD found that Amazon's consent mechanism was fundamentally flawed: users were enrolled in behavioral advertising by default, and the 'consent' was buried within general terms of service rather than presented as a separate, affirmative choice. Amazon could not produce evidence of freely-given, specific, informed consent from the majority of its 300+ million affected users—a core GDPR requirement." },
      { claim: "Users have transparent control over their data.", reality: "Amazon's privacy notices used vague language like 'to improve our services' without specifying that browsing behavior, purchase history, and device usage data were being combined to build detailed advertising profiles. Users had no practical way to understand the full scope of data processing or make informed choices about their data." },
    ],
    regulatoryFindings: [
      {
        act: "GDPR Articles 6, 12, 13, 14",
        description: "Requirements for lawful processing, transparency, and provision of information to data subjects.",
        violations: [
          "Processed personal data for targeted advertising without a valid legal basis.",
          "Failed to provide transparent information about data processing activities.",
        ],
      },
    ],
    outcome: "Luxembourg's CNPD fined Amazon Europe €746 million—the second-largest GDPR fine ever at the time.",
    consequences: "Amazon was ordered to revise its data processing practices and bring its advertising system into compliance with GDPR consent requirements.",
    companyNow: "Amazon has appealed the fine and continues to contest the decision while making incremental changes to its consent mechanisms.",
    attachedPDFs: [],
  },
  {
    id: "8",
    company: "TikTok",
    companyDescription: "Short-form video social media platform owned by ByteDance.",
    companyLongDescription: "TikTok is a short-form video hosting service owned by Chinese company ByteDance. It allows users to create and share videos between 15 seconds and 10 minutes long. TikTok has become one of the most downloaded apps globally.",
    caseDescription: "In April 2023, the UK Information Commissioner's Office fined TikTok £12.7 million for processing the personal data of an estimated 1.4 million UK children under 13 without parental consent between May 2018 and July 2020. The ICO's investigation found that TikTok's age gate—which simply asked users to enter their date of birth—was trivially easy for children to bypass by entering a false age. Despite being aware that many users were underage, TikTok failed to implement meaningful age verification and did not obtain parental consent before collecting children's data, violating the UK GDPR's specific protections for children. The case highlighted the inadequacy of self-declaration age gates as a sole verification mechanism.",
    country: "UK",
    sector: "Social Media",
    foundingYear: 2016,
    companyWorth: "$220B",
    jurisdiction: "UK ICO",
    fineAmount: 12700000,
    fineDisplay: "£12.7M",
    violationSummary: "Processed data of children under 13 without parental consent, failing to use appropriate age verification measures.",
    violations: ["Failure to obtain parental consent", "Excessive retention of childrens data"],
    severityForIndividuals: 4,
    impactedPopulation: 5,
    impactedIndividuals: "1.4M+",
    year: 2023,
    complaintYear: 2020,
    views: 1832,
    whatTheyDid: "Used a trivially bypassable age gate as the sole mechanism to prevent children under 13 from signing up.",
    whyTheyWereWrong: "An estimated 1.4 million UK children used the platform while TikTok collected their data without parental consent.",
    claimsVsReality: [
      { claim: "Users must be at least 13 years old to use TikTok.", reality: "The ICO estimated that up to 1.4 million UK children under the age of 13 were actively using TikTok during the period under investigation. TikTok's own internal data showed patterns of usage consistent with young children—including usage spikes after school hours and content engagement patterns typical of pre-teens—yet the company took no meaningful steps to identify or remove these underage accounts." },
      { claim: "Age verification prevents underage use.", reality: "TikTok's sole age verification mechanism was a date-of-birth entry screen at registration. Children who were initially blocked for being too young could simply close the app, reopen it, and enter a different birth date to gain access. There was no secondary verification, no parental consent mechanism, and no algorithmic detection of likely underage users despite the technology being available in the market." },
    ],
    regulatoryFindings: [
      {
        act: "UK GDPR Article 8 & Data Protection Act 2018",
        description: "Conditions for children's consent in relation to information society services.",
        violations: [
          "Processed personal data of an estimated 1.4 million UK children under 13 without parental consent.",
          "Failed to implement effective age verification mechanisms.",
          "Did not conduct adequate data protection impact assessments for children's data.",
        ],
      },
    ],
    outcome: "The UK ICO fined TikTok £12.7 million for processing children's data without appropriate consent.",
    consequences: "TikTok was required to implement enhanced age verification, strengthen parental controls, and conduct regular data protection impact assessments.",
    companyNow: "TikTok has introduced Family Pairing features, screen time limits for minors, and enhanced age verification processes.",
    attachedPDFs: [],
  },
  {
    id: "9",
    company: "Clearview AI",
    companyDescription: "Facial recognition company scraping billions of images from the internet.",
    companyLongDescription: "Clearview AI is an American facial recognition company that provides software to law enforcement agencies. The company has scraped over 30 billion images from social media and the web to build its facial recognition database.",
    caseDescription: "Clearview AI faced enforcement actions from multiple EU data protection authorities for building a facial recognition database by mass-scraping billions of photos from social media platforms and the public internet—all without the knowledge or consent of the individuals depicted. Authorities in Italy, France, Greece, and the UK each imposed fines and orders, finding that Clearview's practices fundamentally violated GDPR principles of lawfulness, fairness, and transparency. The company argued that publicly available images were fair game, but regulators firmly rejected this position, ruling that biometric data processing requires explicit consent regardless of whether the source images are publicly accessible. The case became a landmark precedent for regulating AI companies that process personal data at scale.",
    country: "USA",
    sector: "Technology",
    foundingYear: 2017,
    companyWorth: "$130M",
    jurisdiction: "EU GDPR",
    fineAmount: 20000000,
    fineDisplay: "€20M",
    violationSummary: "Scraped billions of facial images from social media without consent to build a facial recognition database sold to law enforcement.",
    violations: ["Failure to disclose practices", "Misrepresentation of practices"],
    severityForIndividuals: 5,
    impactedPopulation: 5,
    impactedIndividuals: "Billions",
    year: 2022,
    complaintYear: 2021,
    views: 3201,
    whatTheyDid: "Scraped billions of facial images from social media and the public web without anyone's knowledge or consent.",
    whyTheyWereWrong: "Processing biometric data requires explicit consent under GDPR, regardless of whether the source images were publicly posted.",
    claimsVsReality: [
      { claim: "Publicly available images can be freely collected.", reality: "Multiple EU regulators rejected Clearview's argument that public availability equals free use. Under GDPR, scraping billions of facial images constitutes processing of biometric data—a special category under Article 9 that requires explicit consent. The Italian Garante noted that individuals who post photos on social media do not reasonably expect those images to be scraped into a global surveillance database used by law enforcement and private companies." },
      { claim: "The service is only used by law enforcement for public safety.", reality: "Investigations revealed that Clearview offered free trial accounts to individual police officers without departmental authorization, and also provided its services to private companies, banks, and individuals. The company had no meaningful controls over who accessed its database or how results were used, creating a mass biometric surveillance system operating entirely outside legal frameworks." },
    ],
    regulatoryFindings: [
      {
        act: "GDPR Articles 5, 6, 9, 12-14, 15, 17, 27",
        description: "Multiple GDPR violations including lawfulness, purpose limitation, and data subject rights.",
        violations: [
          "Unlawful processing of biometric data without consent or legal basis.",
          "Failed to provide transparency information to data subjects.",
          "Did not appoint a representative in the EU.",
          "Failed to comply with data subject access and erasure requests.",
        ],
      },
    ],
    outcome: "Multiple EU data protection authorities fined Clearview AI €20 million and ordered it to delete all data of EU residents.",
    consequences: "Clearview AI was ordered to cease processing biometric data of EU citizens and delete all previously collected data.",
    companyNow: "Clearview AI continues to operate primarily in the US market, having largely withdrawn from EU operations.",
    attachedPDFs: [],
  },
  {
    id: "10",
    company: "GoodRx",
    companyDescription: "Health-focused platform offering prescription drug price comparisons.",
    companyLongDescription: "GoodRx Holdings, Inc. is an American healthcare company that provides a telehealth platform and free-to-use website and mobile app that tracks prescription drug prices.",
    caseDescription: "In February 2023, the FTC took its first-ever enforcement action under the Health Breach Notification Rule against GoodRx, a popular prescription drug discount platform. The FTC alleged that GoodRx promised users it would never share their personal health information, then systematically violated that promise by sharing sensitive health data—including users' medication searches, prescription purchases, and health conditions—with advertising giants including Facebook, Google, Criteo, and others. GoodRx used tracking pixels and SDKs to transmit this data, enabling these companies to target users with health-related advertisements. The case was particularly egregious because GoodRx users trusted the platform with deeply sensitive health information, and the company monetized that trust for advertising revenue.",
    country: "USA",
    sector: "Healthcare",
    foundingYear: 2011,
    companyWorth: "$2.8B",
    jurisdiction: "US FTC",
    fineAmount: 1500000,
    fineDisplay: "$1.5M",
    violationSummary: "Shared sensitive health data with Facebook, Google, and other advertisers without user consent, violating the Health Breach Notification Rule.",
    violations: ["Health breach notification failure", "Failure to disclose practices"],
    severityForIndividuals: 5,
    impactedPopulation: 3,
    impactedIndividuals: "Unknown",
    year: 2023,
    complaintYear: 2023,
    views: 678,
    whatTheyDid: "Promised never to share health data, then embedded ad trackers that sent prescription info to Facebook and Google.",
    whyTheyWereWrong: "Sensitive health data was monetized through advertising networks, and a displayed HIPAA badge was misleading since GoodRx isn't a covered entity.",
    claimsVsReality: [
      { claim: "We never share your personal health information with advertisers.", reality: "The FTC documented that GoodRx embedded Facebook Pixel, Google Analytics, Criteo tags, and other tracking technologies across its platform. These tools transmitted detailed health information—including specific medications users searched for, prescriptions they filled, and health conditions they researched—directly to advertising companies. Facebook then used this data to create 'lookalike audiences' targeting people with similar health profiles. GoodRx's own privacy policy explicitly promised users their health data would never be shared for advertising." },
      { claim: "HIPAA compliant health data handling.", reality: "GoodRx prominently displayed a 'HIPAA' badge on its website, implying its data practices met healthcare privacy standards. However, GoodRx is not a HIPAA-covered entity (it's not a healthcare provider, insurer, or clearinghouse), meaning HIPAA protections never actually applied. The FTC found this display was misleading, giving users false confidence that their sensitive prescription and health data was protected by federal healthcare privacy law when it was actually being monetized through advertising networks." },
    ],
    regulatoryFindings: [
      {
        act: "FTC Health Breach Notification Rule, 16 C.F.R. Part 318",
        description: "Requirements to notify consumers when their health data is shared without authorization.",
        violations: [
          "Failed to notify consumers that their health data was being shared with third-party advertisers.",
          "Shared sensitive prescription and health condition data with Facebook, Google, Criteo, and others.",
        ],
      },
    ],
    outcome: "GoodRx agreed to pay $1.5 million in penalties—the first enforcement action under the FTC's Health Breach Notification Rule.",
    consequences: "GoodRx was permanently banned from sharing health data with advertising companies and required to obtain user consent for any future data sharing.",
    companyNow: "GoodRx has overhauled its data practices, removed advertising trackers from health-related pages, and implemented a comprehensive consent management platform.",
    attachedPDFs: [],
  },
  {
    id: "11",
    company: "Google LLC",
    companyDescription: "Global tech company specializing in search, advertising, and cloud.",
    companyLongDescription: "Google LLC is an American multinational corporation and technology company focusing on online advertising, search engine technology, cloud computing, and artificial intelligence.",
    caseDescription: "In September 2023, Google agreed to pay $93 million to settle a lawsuit brought by the California Attorney General over deceptive location tracking practices. The investigation found that even when users turned off their 'Location History' setting—a step Google's own help pages described as stopping location tracking—Google continued to collect and store precise location data through a separate 'Web & App Activity' setting that was enabled by default. This dual-setting design meant users who believed they had opted out of location tracking were still being tracked. The AG's office demonstrated that Google's own engineers and product managers were aware of the misleading design but chose to maintain it because location data was critical to the company's advertising revenue.",
    country: "USA",
    sector: "Technology",
    foundingYear: 1998,
    companyWorth: "$2.1T",
    jurisdiction: "California DOJ",
    fineAmount: 93000000,
    fineDisplay: "$93M",
    violationSummary: "Continued to track users' locations even after they disabled Location History, misleading consumers about their privacy controls.",
    violations: ["Misrepresentation of practices", "Failure to disclose practices"],
    severityForIndividuals: 3,
    impactedPopulation: 5,
    impactedIndividuals: "Unknown",
    year: 2023,
    complaintYear: 2022,
    views: 1456,
    whatTheyDid: "Told users that disabling Location History would stop tracking, while a hidden default setting kept collecting location data.",
    whyTheyWereWrong: "Internal emails showed engineers knew the design was misleading but kept it to protect advertising revenue.",
    claimsVsReality: [
      { claim: "Disabling Location History stops Google from tracking your location.", reality: "Internal emails obtained during the investigation showed Google engineers acknowledging that the Location History toggle was misleading. When users disabled Location History, Google continued collecting precise location data through 'Web & App Activity'—a separate, default-on setting buried deep in account preferences. An internal Google memo stated that turning off Location History 'does not prevent Google from using location,' but this was never disclosed to users." },
      { claim: "Users have full control over location data collection.", reality: "To fully stop location tracking, users had to navigate multiple nested settings pages, disable at least three separate toggles, and manually delete previously collected data. The AG's investigation found that even Google's own engineers struggled to locate all the relevant settings, and internal usability studies confirmed that users were confused by the overlapping controls—yet Google maintained the design because simplifying it would reduce the volume of location data available for its $200+ billion advertising business." },
    ],
    regulatoryFindings: [
      {
        act: "California Consumer Privacy Act & Unfair Competition Law",
        description: "Prohibitions against misleading consumers about data collection practices.",
        violations: [
          "Misled users about location tracking practices by continuing collection after users disabled Location History.",
          "Failed to clearly disclose the role of Web & App Activity in location data collection.",
        ],
      },
    ],
    outcome: "Google agreed to pay $93 million to settle the California AG's investigation into deceptive location tracking.",
    consequences: "Google was required to show users additional disclosures about location tracking and make its settings more transparent.",
    companyNow: "Google has implemented auto-delete features for location data and redesigned its privacy dashboard for greater transparency.",
    attachedPDFs: [],
  },
  {
    id: "12",
    company: "Marriott International",
    companyDescription: "Global hospitality company operating thousands of hotels worldwide.",
    companyLongDescription: "Marriott International, Inc. is an American multinational hospitality company. It has the most rooms of any hotel chain in the world, operating over 8,000 properties across 139 countries.",
    caseDescription: "In October 2020, the UK ICO fined Marriott £18.4 million for a data breach that exposed up to 339 million guest records worldwide. The breach originated in the Starwood Hotels reservation system, which had been compromised by an unknown attacker in 2014—two years before Marriott acquired Starwood in 2016. The intrusion went undetected until September 2018, meaning attackers had access to guest data for four years. The compromised data included names, email addresses, phone numbers, passport numbers, dates of birth, and encrypted payment card details. The ICO found that Marriott failed to conduct adequate due diligence on Starwood's IT systems during the acquisition and did not implement sufficient security monitoring after the merger.",
    country: "UK",
    sector: "Hospitality",
    foundingYear: 1927,
    companyWorth: "$65B",
    jurisdiction: "UK ICO",
    fineAmount: 18400000,
    fineDisplay: "£18.4M",
    violationSummary: "Failed to implement adequate security measures for the Starwood reservation system, exposing 339 million guest records globally.",
    violations: ["Failure to disclose practices"],
    severityForIndividuals: 4,
    impactedPopulation: 5,
    impactedIndividuals: "339M+",
    year: 2020,
    complaintYear: 2018,
    views: 1023,
    whatTheyDid: "Acquired Starwood Hotels without auditing their IT security, then ran the compromised reservation system for two more years.",
    whyTheyWereWrong: "Attackers had been inside the system since 2014, exposing 339 million guest records including passport numbers and payment data.",
    claimsVsReality: [
      { claim: "Guest data is protected by industry-standard security.", reality: "The attackers installed a web shell and remote access trojan on Starwood's servers in 2014, giving them persistent access to the reservation database for four years. During this time, they installed tools to harvest credentials and exfiltrated encrypted payment card data along with the encryption keys needed to decrypt it. Marriott's post-acquisition security team did not discover the compromise because they relied on Starwood's existing (inadequate) security monitoring rather than conducting independent assessments." },
      { claim: "Due diligence was conducted during the Starwood acquisition.", reality: "The ICO found that Marriott's $13.6 billion acquisition of Starwood in 2016 did not include adequate cybersecurity due diligence. Marriott's pre-acquisition review focused primarily on financial and operational risks, not IT security. After the merger, Marriott continued operating the compromised Starwood reservation system alongside its own systems without conducting a thorough security audit, effectively inheriting a four-year-old breach without knowing it." },
    ],
    regulatoryFindings: [
      {
        act: "GDPR Article 5(1)(f) & Article 32",
        description: "Obligation to ensure appropriate security of personal data.",
        violations: [
          "Failed to implement sufficient measures to protect data during and after the Starwood acquisition.",
          "Did not conduct adequate due diligence on Starwood's information systems.",
        ],
      },
    ],
    outcome: "The ICO fined Marriott £18.4 million (reduced from an initial £99 million notice due to representations and COVID-19 impacts).",
    consequences: "Marriott was required to implement enhanced monitoring, encryption, and access controls across its systems.",
    companyNow: "Marriott has consolidated its reservation systems and invested heavily in cybersecurity modernization.",
    attachedPDFs: [],
  },
  {
    id: "13",
    company: "Criteo",
    companyDescription: "French advertising technology company specializing in retargeting ads.",
    companyLongDescription: "Criteo S.A. is a French advertising technology company that specializes in performance marketing technology for online advertisers, operating in over 100 countries.",
    caseDescription: "In June 2023, France's CNIL fined Criteo €40 million for multiple GDPR violations related to its retargeting advertising business. Criteo's technology tracked users across millions of websites using cookies to build detailed browsing profiles for targeted advertising. The CNIL's investigation—triggered by a complaint from Privacy International—found that Criteo could not demonstrate valid consent from the users it tracked, failed to provide adequate transparency about its data processing, and did not properly honor users' rights to withdraw consent or request data erasure. The case was significant because it targeted the adtech intermediary rather than the websites deploying the trackers, establishing that data brokers and advertising technology companies bear independent GDPR compliance obligations.",
    country: "France (EU)",
    sector: "Advertising",
    foundingYear: 2005,
    companyWorth: "$1.8B",
    jurisdiction: "EU GDPR",
    fineAmount: 40000000,
    fineDisplay: "€40M",
    violationSummary: "Failed to obtain valid consent before processing personal data for targeted advertising across websites.",
    violations: ["Failure to obtain parental consent", "Misrepresentation of practices"],
    severityForIndividuals: 3,
    impactedPopulation: 4,
    impactedIndividuals: "370M+",
    year: 2023,
    complaintYear: 2020,
    views: 534,
    whatTheyDid: "Tracked hundreds of millions of users across websites without verifying that partner sites obtained valid consent.",
    whyTheyWereWrong: "Users who opted out found their profile data was still stored and processed rather than deleted.",
    claimsVsReality: [
      { claim: "User tracking is based on valid consent.", reality: "Criteo placed the entire burden of consent collection on its partner websites, but the CNIL found that Criteo never verified whether those partners actually obtained valid consent. In many cases, partners used non-compliant cookie banners with pre-ticked boxes or dark patterns. Since Criteo acted as a joint controller with its partners, it bore independent responsibility for ensuring valid consent—responsibility it completely abdicated while tracking hundreds of millions of users across the web." },
      { claim: "Users can easily withdraw consent and exercise their rights.", reality: "Users who attempted to opt out of Criteo's tracking faced a confusing multi-step process. Even after opting out, the CNIL found that Criteo continued to store and process existing profile data rather than deleting it. Data subject access requests were frequently incomplete or delayed, and the company's privacy dashboard failed to show users the full extent of data collected about them—including browsing histories spanning millions of websites." },
    ],
    regulatoryFindings: [
      {
        act: "GDPR Articles 7, 13, 14, 15, 17, 26",
        description: "Requirements for valid consent, transparency, and data subject rights.",
        violations: [
          "Could not demonstrate valid consent from data subjects for tracking and profiling.",
          "Failed to provide adequate information to users about data processing.",
          "Did not properly honor users' right to withdraw consent and request erasure.",
        ],
      },
    ],
    outcome: "France's CNIL fined Criteo €40 million for GDPR violations related to its advertising tracking practices.",
    consequences: "Criteo was ordered to reform its consent collection mechanism and ensure that valid consent is obtained before any tracking cookies are placed.",
    companyNow: "Criteo has shifted its business model toward contextual advertising and first-party data solutions in response to regulatory and browser privacy changes.",
    attachedPDFs: [],
  },
  {
    id: "14",
    company: "DoorDash",
    companyDescription: "American food delivery and logistics platform.",
    companyLongDescription: "DoorDash, Inc. is an American company that operates an online food ordering and food delivery platform headquartered in San Francisco, California.",
    caseDescription: "In June 2022, DoorDash agreed to pay $375,000 to settle allegations by the California Attorney General that it violated the California Consumer Privacy Act (CCPA) by selling consumer personal information without providing required notice or opt-out rights. The investigation found that DoorDash had participated in a marketing co-operative arrangement where it shared customer data—including names, addresses, and order histories—with other companies in exchange for receiving their customer data. Under CCPA's broad definition, this data exchange constituted a 'sale' of personal information, yet DoorDash failed to disclose this practice in its privacy policy, did not provide a 'Do Not Sell' link on its website, and did not offer consumers any mechanism to opt out of these data exchanges.",
    country: "USA",
    sector: "Food Delivery",
    foundingYear: 2013,
    companyWorth: "$50B",
    jurisdiction: "California DOJ",
    fineAmount: 375000,
    fineDisplay: "$375K",
    violationSummary: "Sold personal information of California consumers to third parties without providing required notice or an opt-out mechanism.",
    violations: ["Failure to disclose practices"],
    severityForIndividuals: 2,
    impactedPopulation: 4,
    impactedIndividuals: "Unknown",
    year: 2022,
    complaintYear: 2022,
    views: 289,
    whatTheyDid: "Exchanged customer data with other companies through a marketing co-operative while denying any data sales.",
    whyTheyWereWrong: "This data exchange constituted a 'sale' under CCPA, yet no notice or opt-out mechanism was provided to consumers.",
    claimsVsReality: [
      { claim: "We do not sell your personal information.", reality: "DoorDash participated in a marketing co-operative where it exchanged detailed customer data—including names, delivery addresses, email addresses, and order histories—with other companies who reciprocated with their own customer data. Under CCPA, any exchange of personal information for 'valuable consideration' constitutes a sale. DoorDash received access to other companies' customer databases in return, clearly meeting this threshold, yet its privacy policy and public statements denied selling consumer data." },
    ],
    regulatoryFindings: [
      {
        act: "California Consumer Privacy Act (CCPA)",
        description: "Requirements for notice and opt-out of personal information sales.",
        violations: [
          "Sold personal information of California consumers without providing required notice.",
          "Failed to provide an opt-out mechanism for data sales.",
        ],
      },
    ],
    outcome: "DoorDash agreed to pay $375,000 in penalties to resolve allegations of CCPA violations.",
    consequences: "DoorDash was required to review its data-sharing agreements and ensure compliance with CCPA opt-out requirements.",
    companyNow: "DoorDash has updated its privacy practices and data-sharing agreements to comply with CCPA requirements.",
    attachedPDFs: [],
  },
];

const generated = generatedCases as EnforcementCase[];
export const cases: EnforcementCase[] =
  Array.isArray(generated) && generated.length > 0 ? generated : [];

/** Find top similar cases by sector, jurisdiction, and violation overlap. */
export function getSimilarCases(case_: EnforcementCase, limit = 2): EnforcementCase[] {
  const others = cases.filter((c) => c.id !== case_.id);
  const violationSet = new Set(case_.violations);
  const scored = others.map((c) => {
    let score = 0;
    if (c.sector === case_.sector) score += 3;
    if (c.jurisdiction === case_.jurisdiction) score += 2;
    score += c.violations.filter((v) => violationSet.has(v)).length * 2;
    return { case: c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.case);
}
