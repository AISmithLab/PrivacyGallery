export interface GlossaryEntry {
  term: string;
  shortDescription: string;
  fullDescription: string;
  relatedTerms?: string[];
}

export interface GlossaryCategory {
  id: string;
  title: string;
  description: string;
  entries: GlossaryEntry[];
}

export const glossary: GlossaryCategory[] = [
  {
    id: "outcomes",
    title: "Enforcement Outcomes",
    description:
      "When a regulator investigates a company, the case can end in many different ways. Here are the most common outcomes and what they actually mean.",
    entries: [
      {
        term: "Complaint Filed",
        shortDescription:
          "A formal legal document initiating an enforcement action against a company.",
        fullDescription:
          "A complaint is the opening move in an enforcement action. The regulator formally alleges that a company violated one or more laws. Filing a complaint does not mean the company has been found guilty — it means the regulator believes there is enough evidence to bring a case. Many complaints are filed simultaneously with a proposed settlement (consent order), but some proceed to litigation. Until the case is resolved, the outcome is pending.",
        relatedTerms: ["Consent Order", "Injunctive Relief"],
      },
      {
        term: "Monetary Penalty",
        shortDescription:
          "A financial fine imposed on the company for its violations.",
        fullDescription:
          "A monetary penalty is a direct financial punishment. The size of the fine typically reflects the severity of the violation, the number of people affected, how long the misconduct lasted, and whether the company cooperated. Some regulators (like the EU under GDPR) can impose fines as a percentage of global revenue, while others (like the US FTC) negotiate fines on a case-by-case basis. Fines can range from a few thousand dollars to hundreds of millions.",
        relatedTerms: ["Consent Order", "Compliance Order"],
      },
      {
        term: "Compliance Order",
        shortDescription:
          "A binding directive requiring the company to take specific corrective actions.",
        fullDescription:
          "A compliance order tells a company exactly what it must do to fix its practices — for example, deleting improperly collected data, implementing a privacy program, appointing a data protection officer, or submitting to regular audits. Compliance orders are forward-looking: they focus on changing future behaviour rather than punishing past conduct. Failure to comply with the order can trigger additional penalties.",
        relatedTerms: ["Consent Order", "Monetary Penalty"],
      },
      {
        term: "Consent Order",
        shortDescription:
          "A negotiated settlement where the company agrees to specific terms without admitting liability.",
        fullDescription:
          "A consent order (also called a consent decree) is essentially a deal between the regulator and the company. The company agrees to change its practices, implement safeguards, and sometimes pay a fine — but crucially, it does not admit that it broke the law. This is common in US FTC cases. Consent orders are legally binding: if the company violates the terms, the regulator can seek additional penalties, often much larger than the original fine. Many consent orders last 20 years and include regular third-party audits.",
        relatedTerms: ["Compliance Order", "Complaint Filed"],
      },
      {
        term: "Injunctive Relief",
        shortDescription:
          "A court order requiring the company to stop or start doing something specific.",
        fullDescription:
          "Injunctive relief is when a regulator asks a court to order a company to change its behaviour — for example, to stop collecting data from children, to delete illegally obtained records, or to implement specific security measures. Unlike a fine, injunctive relief directly addresses the harmful practice. It can be temporary (while a case is ongoing) or permanent (as part of a final judgment). Courts grant injunctive relief when monetary damages alone would not adequately address the harm.",
        relatedTerms: ["Complaint Filed", "Compliance Order"],
      },
      {
        term: "Warning",
        shortDescription:
          "A formal notice that a violation occurred, without imposing penalties.",
        fullDescription:
          "A warning is the regulator's way of saying \"we found a problem, fix it.\" It officially documents that a breach occurred but stops short of imposing a fine or binding order. Warnings are typically used when the violation is relatively minor, the company has already taken corrective steps, or the regulator wants to establish a record before escalating. If the company ignores the warning and continues the same behaviour, the next enforcement action is likely to be much more severe.",
        relatedTerms: ["Reprimand", "Guidance / Advisory"],
      },
      {
        term: "Reprimand",
        shortDescription:
          "An official censure — stronger than a warning but without a financial penalty.",
        fullDescription:
          "A reprimand is a formal finding that a company breached the law, recorded on the public record. It carries more weight than a warning because it represents a definitive determination of wrongdoing, not just a caution. Reprimands are common under GDPR, where data protection authorities may choose to reprimand rather than fine when the breach is serious enough to document but mitigating factors exist — for example, the company cooperated fully or the breach was quickly contained.",
        relatedTerms: ["Warning", "Compliance Order"],
      },
      {
        term: "Guidance / Advisory",
        shortDescription:
          "Non-binding recommendations from the regulator on how to comply with the law.",
        fullDescription:
          "Guidance or advisory opinions are the lightest form of regulatory response. Rather than taking formal enforcement action, the regulator issues recommendations or clarifications about what the law requires. These are not legally binding, but ignoring them is risky — if a company disregards guidance and later faces enforcement, the regulator can point to the guidance as evidence that the company knew what was expected. Guidance is often issued to an entire industry rather than a single company.",
        relatedTerms: ["Warning", "No Formal Penalty"],
      },
      {
        term: "No Formal Penalty",
        shortDescription:
          "The case was resolved without any formal enforcement action.",
        fullDescription:
          "Sometimes a regulator investigates and closes the case without imposing any formal penalty. This can happen for several reasons: the company voluntarily fixed the problem, the evidence was insufficient to proceed, the harm was minimal, or the regulator accepted the company's corrective measures as adequate. \"No formal penalty\" does not mean the company did nothing wrong — it means the regulator chose not to pursue formal action at that time.",
        relatedTerms: ["Warning", "Guidance / Advisory"],
      },
    ],
  },
  {
    id: "violations",
    title: "Violation Types",
    description:
      "Privacy violations fall into distinct categories based on how the company failed its users. Understanding these categories helps you see patterns across cases.",
    entries: [
      {
        term: "Unauthorized Data Collection",
        shortDescription:
          "Collecting personal data without explicit consent, including using pre-ticked boxes or ignoring opt-out requests.",
        fullDescription:
          "This violation occurs when a company gathers personal information without obtaining proper, informed consent from users. It includes practices like using pre-ticked consent boxes (banned under GDPR), collecting data types users didn't agree to, ignoring opt-out requests, scraping data from public profiles, or continuing to collect data after consent is withdrawn. Under GDPR, consent must be freely given, specific, informed, and unambiguous. Under COPPA, collecting children's data requires verifiable parental consent. This is one of the most fundamental privacy violations — the company took data it had no right to take.",
        relatedTerms: ["Misleading Privacy Policies", "Illegal Monitoring/Surveillance"],
      },
      {
        term: "Data Breach & Negligence",
        shortDescription:
          "Failure to implement reasonable security measures, leading to unauthorized access to sensitive information.",
        fullDescription:
          "This violation covers cases where a company failed to protect personal data through adequate security measures, resulting in a data breach or creating conditions that made one likely. Examples include: storing passwords in plain text, failing to patch known vulnerabilities, leaving databases publicly accessible, not encrypting sensitive data in transit or at rest, and lacking basic access controls. The key element is negligence — the company didn't take reasonable steps to safeguard the data it collected. Under most privacy laws, companies have a duty to implement security measures appropriate to the sensitivity of the data they hold. Breaches affecting health data, financial records, or children's information carry particularly severe consequences.",
        relatedTerms: ["Unauthorized Disclosure/Selling", "Improper Data Disposal"],
      },
      {
        term: "Unauthorized Disclosure/Selling",
        shortDescription:
          "Sharing, selling, or transferring personal data to third parties without authorization.",
        fullDescription:
          "This violation occurs when a company shares, sells, or otherwise transfers personal data to third parties without the user's knowledge or consent. Common examples include selling user data to data brokers, sharing browsing history with advertisers without disclosure, providing employee data to unauthorized parties, or allowing third-party SDKs to collect user data without informing users. Under CCPA/CPRA, consumers have the explicit right to opt out of the sale of their personal information. Under GDPR, sharing data with third parties generally requires a lawful basis and transparency. Several major enforcement actions have targeted companies that monetized user data through undisclosed third-party sharing.",
        relatedTerms: ["Misleading Privacy Policies", "Unauthorized Data Collection"],
      },
      {
        term: "Failure to Honor Consumer Rights",
        shortDescription:
          "Not fulfilling requests to access, delete, or correct personal information under privacy laws.",
        fullDescription:
          "Modern privacy laws like GDPR, CCPA/CPRA, and others grant individuals specific rights over their personal data — including the right to access, delete, correct, and port their data. This violation means a company failed to respond to these requests within required timeframes, made the process unreasonably difficult, ignored requests entirely, or only partially fulfilled them. For example, a company might acknowledge a deletion request but retain the data in backup systems indefinitely, or provide only partial data in response to an access request. Under GDPR, companies must respond within 30 days. Under CCPA, the deadline is 45 days. Systematic failure to honor these rights often triggers enforcement action.",
        relatedTerms: ["Unauthorized Data Collection", "Misleading Privacy Policies"],
      },
      {
        term: "Misleading Privacy Policies",
        shortDescription:
          "Providing inaccurate or deceptive information about how data is collected and used.",
        fullDescription:
          "This violation covers cases where a company's stated privacy practices don't match its actual practices. It includes outright lies in privacy policies (claiming data isn't shared when it is), material omissions (failing to mention data sales to third parties), and deceptive framing (burying important disclosures in dense legal language designed to be ignored). In the US, the FTC prosecutes this under Section 5 of the FTC Act as a \"deceptive trade practice.\" The key test is whether a reasonable consumer would be misled by the company's representations. This is one of the most commonly cited violations because privacy policies are the primary mechanism through which companies communicate their data practices to users.",
        relatedTerms: ["Unauthorized Data Collection", "Unauthorized Disclosure/Selling"],
      },
      {
        term: "Invasion of Seclusion",
        shortDescription:
          "Physically or electronically intruding into a person's private space or affairs.",
        fullDescription:
          "Invasion of seclusion is a tort (civil wrong) that occurs when someone intentionally intrudes upon another's private affairs in a manner that would be highly offensive to a reasonable person. In the digital context, this includes accessing private accounts without authorization, intercepting private communications, using spyware to monitor someone's device activity, or deploying hidden cameras or microphones. Unlike other privacy violations that focus on data handling, invasion of seclusion focuses on the act of intrusion itself — the mere act of prying into someone's private space is the violation, regardless of what is found or how the information is used.",
        relatedTerms: ["Illegal Monitoring/Surveillance", "Unauthorized Data Collection"],
      },
      {
        term: "False Light/Misappropriation",
        shortDescription:
          "Using a person's name or likeness without consent, or publishing private facts that place someone in a false light.",
        fullDescription:
          "This category covers two related privacy torts. False light occurs when someone publishes information that places another person before the public in a misleading way — for example, using someone's photo in a context that implies something untrue about them. Misappropriation occurs when someone uses another person's name, likeness, or identity for commercial purposes without consent — such as using a customer's photo in advertising without permission, or training AI models on personal images without authorization. In the data privacy context, this also extends to companies creating misleading profiles or inferences about individuals based on their data, or using personal information in ways that misrepresent the individual.",
        relatedTerms: ["Misleading Privacy Policies", "Invasion of Seclusion"],
      },
      {
        term: "Improper Data Disposal",
        shortDescription:
          "Failing to securely destroy physical or electronic records, leading to potential exposure.",
        fullDescription:
          "This violation occurs when a company fails to properly dispose of personal data that it no longer needs or is required to delete. Examples include throwing unshredded documents containing personal information in regular trash, selling or donating old computers and hard drives without wiping them, retaining data in backup systems long after deletion was requested, or failing to destroy data when a retention period expires. Under the FTC's Disposal Rule, companies must take reasonable measures to protect against unauthorized access to consumer information during disposal. Improper disposal is particularly dangerous because it can expose large volumes of sensitive data — often old records that consumers have forgotten about — to identity thieves and other bad actors.",
        relatedTerms: ["Data Breach & Negligence", "Failure to Honor Consumer Rights"],
      },
      {
        term: "Illegal Monitoring/Surveillance",
        shortDescription:
          "Using tracking devices, cameras, or web session recording technology without consent.",
        fullDescription:
          "This violation covers the unauthorized monitoring of individuals through technological means. It includes installing tracking software or GPS devices without consent, using web session recording or chat box technology to capture user interactions without disclosure, deploying facial recognition cameras without notice, recording phone calls without required consent, and using browser fingerprinting or cross-device tracking without transparency. Several major enforcement actions have targeted companies for secretly recording user sessions, tracking location data through mobile apps without adequate disclosure, or using pixel tracking in emails to monitor behavior. The distinction from unauthorized data collection is the active, ongoing nature of surveillance — the company isn't just collecting data points, it's continuously watching.",
        relatedTerms: ["Invasion of Seclusion", "Unauthorized Data Collection"],
      },
    ],
  },
  {
    id: "concepts",
    title: "Key Concepts",
    description:
      "Core ideas and legal frameworks that come up repeatedly in privacy enforcement. These concepts provide the foundation for understanding how and why regulators act.",
    entries: [
      {
        term: "Section 5 of the FTC Act",
        shortDescription:
          "The primary US legal authority used to bring privacy and data security cases.",
        fullDescription:
          "Section 5 of the Federal Trade Commission Act (1914) prohibits \"unfair or deceptive acts or practices in or affecting commerce.\" While it was not originally written with data privacy in mind, the FTC has broadly interpreted it to cover privacy violations, data security failures, and misleading data practices. \"Deceptive\" means a company made false or misleading claims about its practices. \"Unfair\" means a practice causes substantial harm to consumers that they cannot reasonably avoid and that is not outweighed by benefits. This single statute is the foundation of most US federal privacy enforcement.",
        relatedTerms: ["Consent Order", "Complaint Filed"],
      },
      {
        term: "COPPA",
        shortDescription:
          "The Children's Online Privacy Protection Act — the primary US law protecting children's data online.",
        fullDescription:
          "COPPA (1998) requires websites and online services directed at children under 13 to obtain verifiable parental consent before collecting personal information, provide parents access to their children's data, give parents the choice to delete it, and maintain reasonable security. It is enforced by the FTC and carries significant penalties — Epic Games paid $275 million for COPPA violations in 2022. COPPA applies not just to kids' sites but to any service that has \"actual knowledge\" it is collecting data from children under 13.",
        relatedTerms: [
          "Unauthorized Data Collection",
          "Section 5 of the FTC Act",
        ],
      },
      {
        term: "GDPR",
        shortDescription:
          "The EU's General Data Protection Regulation — the world's most comprehensive privacy law.",
        fullDescription:
          "The GDPR (2018) is a regulation by the European Union that governs the collection, processing, and storage of personal data for individuals within the EU/EEA. It established strong individual rights (access, deletion, portability), strict consent requirements, mandatory breach notification within 72 hours, and fines of up to 4% of global annual revenue or €20 million (whichever is higher). The GDPR has become a global standard, influencing privacy laws in Brazil, California, India, and dozens of other jurisdictions.",
        relatedTerms: ["Monetary Penalty", "Compliance Order"],
      },
      {
        term: "Consent Decree",
        shortDescription:
          "A court-approved settlement that is legally binding on both parties.",
        fullDescription:
          "A consent decree is a judicial order that both parties (typically the regulator and the company) have agreed to. It becomes a binding court order, meaning violations can be treated as contempt of court. In privacy enforcement, consent decrees typically require companies to implement comprehensive privacy programs, submit to regular independent audits (often for 20 years), delete improperly collected data, and sometimes pay monetary penalties. They are more powerful than administrative consent orders because they carry the full force of a court order.",
        relatedTerms: ["Consent Order", "Injunctive Relief"],
      },
      {
        term: "Data Broker",
        shortDescription:
          "A company that collects and sells personal information about consumers without a direct relationship.",
        fullDescription:
          "Data brokers aggregate personal information from public records, commercial sources, and online activity to build detailed profiles on individuals, which they sell to advertisers, employers, insurers, and others. Most consumers have never heard of the data brokers that hold their information. This industry is a growing focus of privacy enforcement because data brokers often operate without consumer knowledge or consent, collect sensitive information like location data and health inferences, and make it nearly impossible for individuals to opt out. Several major FTC cases have targeted data broker practices.",
        relatedTerms: [
          "Unauthorized Disclosure/Selling",
          "Misleading Privacy Policies",
        ],
      },
      {
        term: "Severity Rating",
        shortDescription:
          "Our 1–5 score measuring how severely a case impacted individuals, based on data sensitivity and scale.",
        fullDescription:
          "The severity rating in our dataset is a deterministic score from 1 to 5 calculated from two factors: data sensitivity and number of people impacted. Data sensitivity is scored 1–3: the most sensitive categories (health, biometric, children's data, SSN, financial, bank) score 3; moderately sensitive data (location, identity, credit, genetic) scores 2; everything else scores 1. People impacted is scored 0–2: over 1 million people scores 2, between 10,000 and 999,999 scores 1, and fewer than 10,000 or unknown scores 0. The final severity is the sum of both scores, clamped to the range 1–5. For example, a case involving children's data (3) affecting 50,000 people (1) would score 4. A case involving browsing data (1) with unknown affected individuals (0) would score 1.",
        relatedTerms: ["COPPA", "GDPR"],
      },
      {
        term: "Right of Access",
        shortDescription:
          "An individual's legal right to obtain a copy of their personal data held by a company.",
        fullDescription:
          "Under laws like GDPR (Article 15), individuals have the right to request and receive a copy of all personal data a company holds about them, along with information about how it is being used, who it has been shared with, and how long it will be retained. Companies must respond within a set timeframe (typically 30 days). This right is fundamental to privacy enforcement because it allows individuals and regulators to verify whether companies are actually doing what they claim with personal data. Failure to honour access requests is itself a violation in many jurisdictions.",
        relatedTerms: ["GDPR", "Unauthorized Disclosure/Selling"],
      },
    ],
  },
];
