export type ViolationType =
  | "Misrepresentation of practices"
  | "Failure to disclose practices"
  | "Health breach notification failure"
  | "Excessive retention of childrens data"
  | "Failure of parent control over childrens data"
  | "Failure to obtain parental consent";

export type Jurisdiction = "US FTC" | "California DOJ" | "UK ICO" | "Singapore PDPC" | "EU GDPR" | "EU EDPB";

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
  claimsVsReality: ClaimVsReality[];
  regulatoryFindings: RegulatoryFinding[];
  outcome: string;
  consequences: string;
  companyNow: string;
  attachedPDFs: string[];
}

export const JURISDICTIONS: Jurisdiction[] = [
  "US FTC",
  "California DOJ",
  "UK ICO",
  "Singapore PDPC",
  "EU GDPR",
  "EU EDPB",
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

export const cases: EnforcementCase[] = [
  {
    id: "1",
    company: "Snapchat",
    companyDescription: "A U.S.-based social media company that operates a messaging app where users share disappearing photos and videos.",
    companyLongDescription: "Snap Inc. is an American technology company, founded on September 16, 2011, by Evan Spiegel, Bobby Murphy, and Reggie Brown, based in Santa Monica, California. The company developed and maintains technological products and services, namely Snapchat, Spectacles, Bitmoji, and SnapBoost. The company was named Snapchat Inc. at its inception, but it was rebranded Snap Inc. on September 24, 2016.",
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
    claimsVsReality: [
      { claim: "Snaps 'disappear forever' after the timer expires.", reality: "Recipients could save them via file storage, third-party apps, or screenshots." },
      { claim: "Senders would be notified if recipients took a screenshot.", reality: "Screenshot detection could be evaded on some devices." },
      { claim: "No location tracking by the Android app.", reality: "The Android app sent Wi-Fi and cell-based location to an analytics provider." },
      { claim: "Find Friends used only phone/email/Facebook ID.", reality: "The app collected the full address book without adequate notice." },
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
    claimsVsReality: [
      { claim: "Age-appropriate content and privacy protections for all users.", reality: "Children under 13 were exposed to real-time voice and text chat with strangers without parental consent." },
      { claim: "In-app purchases require clear confirmation.", reality: "Dark patterns led to unintended purchases with confusing button layouts." },
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
    claimsVsReality: [
      { claim: "User data transfers to the US comply with GDPR requirements.", reality: "Meta continued transferring data without adequate safeguards after the EU-US Privacy Shield was invalidated." },
      { claim: "Standard Contractual Clauses provide sufficient protection.", reality: "US surveillance laws undermined the protections offered by SCCs." },
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
    claimsVsReality: [
      { claim: "Customer payment data is processed securely.", reality: "A Magecart-style attack diverted customer payment details to a fraudulent site for months undetected." },
      { claim: "Robust cybersecurity measures protect personal data.", reality: "BA lacked adequate security testing, multi-factor authentication, and network monitoring." },
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
    claimsVsReality: [
      { claim: "Patient records are protected by robust security systems.", reality: "Attackers exploited vulnerabilities in SingHealth's IT systems for nearly a year before detection." },
      { claim: "Only authorized medical staff can access patient data.", reality: "A sophisticated state-sponsored APT group exfiltrated 1.5 million patient records." },
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
    claimsVsReality: [
      { claim: "We do not sell your personal information.", reality: "Sephora shared customer data with third-party analytics and advertising companies in exchange for services—constituting a 'sale' under CCPA." },
      { claim: "We respect your privacy choices.", reality: "Failed to process Global Privacy Control opt-out signals from consumers' browsers." },
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
    claimsVsReality: [
      { claim: "Advertising targeting is based on user consent.", reality: "Amazon's advertising system processed personal data without obtaining valid consent under GDPR." },
      { claim: "Users have transparent control over their data.", reality: "Privacy notices did not adequately explain how personal data was used for ad targeting." },
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
    claimsVsReality: [
      { claim: "Users must be at least 13 years old to use TikTok.", reality: "Up to 1.4 million UK children under 13 were estimated to have used the platform." },
      { claim: "Age verification prevents underage use.", reality: "Age gates were easily bypassed with no meaningful verification." },
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
    claimsVsReality: [
      { claim: "Publicly available images can be freely collected.", reality: "GDPR applies to processing of personal data regardless of whether images are publicly accessible." },
      { claim: "The service is only used by law enforcement for public safety.", reality: "The mass surveillance system was deployed without consent or legal basis affecting billions of individuals." },
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
    claimsVsReality: [
      { claim: "We never share your personal health information with advertisers.", reality: "GoodRx shared users' health data—including medication searches and prescriptions—with Facebook, Google, and other ad platforms." },
      { claim: "HIPAA compliant health data handling.", reality: "GoodRx is not a covered entity under HIPAA, and monetized health data through advertising pixels." },
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
    claimsVsReality: [
      { claim: "Disabling Location History stops Google from tracking your location.", reality: "Google continued tracking location through Web & App Activity, even when Location History was turned off." },
      { claim: "Users have full control over location data collection.", reality: "Multiple overlapping settings made it practically impossible to fully disable location tracking." },
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
    claimsVsReality: [
      { claim: "Guest data is protected by industry-standard security.", reality: "The Starwood systems had been compromised since 2014—two years before Marriott's acquisition—and were not properly audited." },
      { claim: "Due diligence was conducted during the Starwood acquisition.", reality: "Marriott failed to adequately investigate the security posture of Starwood's IT systems." },
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
    claimsVsReality: [
      { claim: "User tracking is based on valid consent.", reality: "Criteo relied on partner websites to collect consent but failed to verify that consent was actually obtained." },
      { claim: "Users can easily withdraw consent and exercise their rights.", reality: "The opt-out process was confusing and did not effectively stop data processing." },
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
    claimsVsReality: [
      { claim: "We do not sell your personal information.", reality: "DoorDash shared customer data with a marketing co-operative, which constituted a 'sale' under CCPA." },
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
