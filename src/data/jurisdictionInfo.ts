import type { Jurisdiction } from "./cases";

export interface PrivacyLaw {
  name: string;
  year: number;
  description: string;
}

export interface EnforcementAuthority {
  name: string;
  acronym: string;
  role: string;
}

export interface JurisdictionInfo {
  jurisdiction: Jurisdiction;
  fullName: string;
  flag: string;
  abbreviation: string;
  overview: string;
  laws: PrivacyLaw[];
  authority: EnforcementAuthority;
  enforcementStyle: string;
  /** ISO 3166-1 numeric codes for map highlighting (used by world-atlas topojson) */
  countryCodes: string[];
  color: string;
}

export const JURISDICTION_INFO: Record<Jurisdiction, JurisdictionInfo> = {
  "US FTC": {
    jurisdiction: "US FTC",
    fullName: "United States — Federal Trade Commission",
    flag: "🇺🇸",
    abbreviation: "FTC",
    overview:
      "The FTC is the primary federal agency enforcing consumer privacy in the United States. It relies on Section 5 of the FTC Act, which prohibits unfair or deceptive trade practices, to bring privacy and data security cases. The U.S. lacks a single comprehensive federal privacy law, so the FTC fills regulatory gaps through enforcement actions and consent decrees.",
    laws: [
      {
        name: "FTC Act Section 5",
        year: 1914,
        description:
          "Prohibits unfair or deceptive acts or practices in commerce. The FTC interprets this broadly to cover privacy violations, data security failures, and misleading data practices.",
      },
      {
        name: "Children's Online Privacy Protection Act (COPPA)",
        year: 1998,
        description:
          "Requires websites and online services to obtain verifiable parental consent before collecting personal information from children under 13.",
      },
      {
        name: "Health Breach Notification Rule",
        year: 2009,
        description:
          "Requires vendors of personal health records and related entities to notify consumers and the FTC following a breach of unsecured health information.",
      },
    ],
    authority: {
      name: "Federal Trade Commission",
      acronym: "FTC",
      role: "Independent federal agency responsible for protecting consumers and promoting competition. Brings enforcement actions through administrative proceedings and federal court.",
    },
    enforcementStyle:
      "The FTC often frames cases around deceptive business practices — companies saying one thing about privacy but doing another. It relies heavily on consent decrees and compliance orders, sometimes accompanied by significant monetary penalties. The agency frequently targets tech companies, social media platforms, and data brokers, with a growing focus on children's privacy and algorithmic harm.",
    countryCodes: ["840"],
    color: "#2563EB",
  },

  "California DOJ": {
    jurisdiction: "California DOJ",
    fullName: "California, United States — Department of Justice",
    flag: "🐻",
    abbreviation: "CA DOJ",
    overview:
      "California leads U.S. state-level privacy enforcement through the California Consumer Privacy Act (CCPA) and its successor, the CPRA. The state Attorney General and the California Privacy Protection Agency (CPPA) share enforcement authority. California's privacy framework is the closest the U.S. has to a comprehensive data protection law at any level.",
    laws: [
      {
        name: "California Consumer Privacy Act (CCPA)",
        year: 2018,
        description:
          "Grants California residents the right to know what personal data is collected, to delete it, to opt out of its sale, and to not be discriminated against for exercising these rights.",
      },
      {
        name: "California Privacy Rights Act (CPRA)",
        year: 2020,
        description:
          "Amends and expands the CCPA with new rights including data correction, limits on sensitive data use, and creation of the CPPA as a dedicated enforcement agency.",
      },
    ],
    authority: {
      name: "California Department of Justice / California Privacy Protection Agency",
      acronym: "CA DOJ / CPPA",
      role: "The Attorney General brings enforcement actions under CCPA/CPRA and other California consumer protection statutes. The CPPA, established by the CPRA, is a dedicated privacy enforcement body with rulemaking and enforcement powers.",
    },
    enforcementStyle:
      "California enforcement tends to focus on consumer rights and transparency obligations — particularly around opt-out rights, notice requirements, and data sale disclosures. The state has pursued actions against large tech platforms and data brokers. Penalties can reach $7,500 per intentional violation, making aggregate fines significant for widespread practices.",
    countryCodes: ["840"],
    color: "#7C3AED",
  },

  "UK ICO": {
    jurisdiction: "UK ICO",
    fullName: "United Kingdom — Information Commissioner's Office",
    flag: "🇬🇧",
    abbreviation: "ICO",
    overview:
      "The UK enforces privacy primarily through the UK GDPR and Data Protection Act 2018. The Information Commissioner's Office oversees enforcement and has broad investigatory and corrective powers. Post-Brexit, the UK maintains a data protection regime closely aligned with but independent from the EU GDPR.",
    laws: [
      {
        name: "UK General Data Protection Regulation (UK GDPR)",
        year: 2018,
        description:
          "The UK's post-Brexit version of the EU GDPR, retaining equivalent principles around lawfulness, fairness, transparency, data minimization, and individual rights.",
      },
      {
        name: "Data Protection Act 2018",
        year: 2018,
        description:
          "Supplements the UK GDPR with provisions for law enforcement processing, intelligence services, and specific exemptions under UK law.",
      },
      {
        name: "Privacy and Electronic Communications Regulations (PECR)",
        year: 2003,
        description:
          "Covers electronic marketing, cookies, and communications privacy. Often enforced alongside the UK GDPR for marketing-related violations.",
      },
    ],
    authority: {
      name: "Information Commissioner's Office",
      acronym: "ICO",
      role: "The UK's independent supervisory authority for data protection. Has power to issue fines up to £17.5 million or 4% of global turnover, conduct audits, issue enforcement notices, and prosecute criminal offences.",
    },
    enforcementStyle:
      "The ICO takes a risk-based approach, often emphasizing data security failures and lawful basis for processing. It uses a mix of reprimands, enforcement notices, and monetary penalties. The ICO frequently focuses on public sector bodies, marketing companies, and organizations that suffer data breaches. It tends to be more corrective than punitive compared to some EU counterparts.",
    countryCodes: ["826"],
    color: "#DC2626",
  },

  "Singapore PDPC": {
    jurisdiction: "Singapore PDPC",
    fullName: "Singapore — Personal Data Protection Commission",
    flag: "🇸🇬",
    abbreviation: "PDPC",
    overview:
      "Singapore enforces data protection through the Personal Data Protection Act (PDPA), administered by the PDPC. The framework balances individual data protection rights with organizations' needs to collect and use data for legitimate purposes. Singapore's approach is pragmatic and business-friendly while maintaining meaningful enforcement.",
    laws: [
      {
        name: "Personal Data Protection Act (PDPA)",
        year: 2012,
        description:
          "Governs the collection, use, and disclosure of personal data by organizations. Establishes consent requirements, data protection obligations, and the Do Not Call Registry.",
      },
    ],
    authority: {
      name: "Personal Data Protection Commission",
      acronym: "PDPC",
      role: "Statutory body under the Infocomm Media Development Authority (IMDA) responsible for administering and enforcing the PDPA. Issues guidance, conducts investigations, and imposes financial penalties.",
    },
    enforcementStyle:
      "The PDPC tends toward corrective action and proportional penalties. It frequently issues directions to organizations to improve their data protection practices alongside financial penalties. Cases often focus on data security failures, unauthorized disclosure, and consent obligations. Penalties are moderate compared to EU fines but can reach up to S$1 million per breach.",
    countryCodes: ["702"],
    color: "#059669",
  },

  "EU GDPR": {
    jurisdiction: "EU GDPR",
    fullName: "European Union — General Data Protection Regulation",
    flag: "🇪🇺",
    abbreviation: "GDPR",
    overview:
      "The GDPR is the world's most comprehensive and influential data protection regulation. Enforced by national Data Protection Authorities (DPAs) across EU member states, it establishes strong individual rights, strict consent requirements, and significant penalties. The GDPR has become a global benchmark for privacy legislation.",
    laws: [
      {
        name: "General Data Protection Regulation (GDPR)",
        year: 2016,
        description:
          "Comprehensive data protection regulation establishing principles of lawfulness, purpose limitation, data minimization, and accountability. Grants individuals rights to access, rectification, erasure, portability, and objection to processing.",
      },
      {
        name: "ePrivacy Directive",
        year: 2002,
        description:
          "Complements the GDPR with specific rules on electronic communications, including cookie consent requirements and marketing restrictions.",
      },
    ],
    authority: {
      name: "National Data Protection Authorities (DPAs)",
      acronym: "Various (CNIL, BfDI, DPC, etc.)",
      role: "Each EU member state has an independent supervisory authority responsible for enforcing the GDPR within its territory. Cross-border cases are handled through the One-Stop-Shop mechanism with a lead supervisory authority.",
    },
    enforcementStyle:
      "EU GDPR enforcement is rights-based and formal in its legal reasoning. Fines can reach up to 4% of global annual turnover or €20 million, whichever is higher. DPAs vary in approach — some (like France's CNIL) are more aggressive with large fines, while others prefer corrective measures. Common focuses include consent violations, transparency failures, data transfer issues, and lawful basis challenges.",
    countryCodes: [
      "040", "056", "100", "191", "196", "203", "208", "233", "246",
      "250", "276", "300", "348", "372", "380", "428", "440", "442",
      "470", "528", "616", "620", "642", "703", "705", "724", "752",
    ],
    color: "#D97706",
  },

  "EU EDPB": {
    jurisdiction: "EU EDPB",
    fullName: "European Union — European Data Protection Board",
    flag: "🇪🇺",
    abbreviation: "EDPB",
    overview:
      "The EDPB is an independent EU body that ensures consistent application of the GDPR across member states. It issues binding decisions in cross-border disputes, adopts guidelines and recommendations, and coordinates between national DPAs. EDPB decisions often address the most significant and precedent-setting privacy questions in Europe.",
    laws: [
      {
        name: "General Data Protection Regulation (GDPR)",
        year: 2016,
        description:
          "The EDPB operates under the GDPR framework, ensuring its consistent application and resolving disputes between national DPAs on cross-border cases.",
      },
    ],
    authority: {
      name: "European Data Protection Board",
      acronym: "EDPB",
      role: "Independent EU body composed of representatives from each national DPA and the European Data Protection Supervisor. Issues binding decisions, guidelines, and opinions to ensure consistent GDPR enforcement across the EU.",
    },
    enforcementStyle:
      "The EDPB focuses on harmonization and consistency rather than direct enforcement. Its binding decisions in cross-border cases often result in higher fines than originally proposed by lead supervisory authorities. The EDPB has been instrumental in major cases involving big tech companies, international data transfers, and consent frameworks. Its approach is systematic and precedent-driven.",
    countryCodes: [
      "040", "056", "100", "191", "196", "203", "208", "233", "246",
      "250", "276", "300", "348", "372", "380", "428", "440", "442",
      "470", "528", "616", "620", "642", "703", "705", "724", "752",
    ],
    color: "#B45309",
  },

  "Australia OAIC": {
    jurisdiction: "Australia OAIC",
    fullName: "Australia — Office of the Australian Information Commissioner",
    flag: "🇦🇺",
    abbreviation: "OAIC",
    overview:
      "Australia enforces privacy through the Privacy Act 1988 and the Australian Privacy Principles (APPs), overseen by the OAIC. The framework applies to most Australian government agencies and private sector organizations with annual turnover above A$3 million. Recent reforms have strengthened enforcement powers and increased penalties significantly.",
    laws: [
      {
        name: "Privacy Act 1988",
        year: 1988,
        description:
          "Australia's primary privacy legislation establishing the Australian Privacy Principles (APPs) governing how personal information is handled by government agencies and private organizations.",
      },
      {
        name: "Notifiable Data Breaches (NDB) Scheme",
        year: 2018,
        description:
          "Requires organizations to notify the OAIC and affected individuals when a data breach is likely to result in serious harm.",
      },
    ],
    authority: {
      name: "Office of the Australian Information Commissioner",
      acronym: "OAIC",
      role: "Independent statutory agency responsible for privacy regulation, freedom of information oversight, and government information policy. Has power to investigate, make determinations, accept enforceable undertakings, and seek civil penalties.",
    },
    enforcementStyle:
      "The OAIC has historically favored a conciliatory approach, using investigations, enforceable undertakings, and determinations before resorting to penalties. However, recent legislative reforms have dramatically increased maximum penalties to A$50 million or 30% of turnover. The regulator frequently focuses on data breach responses, APP compliance, and transparency obligations. Australia is moving toward a more assertive enforcement posture.",
    countryCodes: ["036"],
    color: "#0891B2",
  },
};

/** Get jurisdiction info by jurisdiction key */
export function getJurisdictionInfo(jurisdiction: Jurisdiction): JurisdictionInfo {
  return JURISDICTION_INFO[jurisdiction];
}

/** Map from ISO country code to jurisdiction(s) */
export function getJurisdictionByCountryCode(code: string): Jurisdiction[] {
  const results: Jurisdiction[] = [];
  for (const [key, info] of Object.entries(JURISDICTION_INFO)) {
    if (info.countryCodes.includes(code)) {
      results.push(key as Jurisdiction);
    }
  }
  return results;
}
