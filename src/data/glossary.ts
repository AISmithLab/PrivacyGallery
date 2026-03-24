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
        term: "Misrepresentation of Practices",
        shortDescription:
          "The company said one thing about its privacy practices but did another.",
        fullDescription:
          "This is the most common violation type. It means a company made specific promises about how it handles personal data — in its privacy policy, marketing materials, or user agreements — and then broke those promises. Classic examples include: telling users their data won't be shared with third parties and then selling it to data brokers, claiming data is encrypted when it isn't, or promising users can delete their accounts while retaining the data indefinitely. In the US, the FTC prosecutes this under Section 5 of the FTC Act as a \"deceptive trade practice.\"",
        relatedTerms: ["Failure to Disclose Practices"],
      },
      {
        term: "Failure to Disclose Practices",
        shortDescription:
          "The company collected or used data without telling users what it was doing.",
        fullDescription:
          "Unlike misrepresentation (where the company lied), failure to disclose means the company simply never told users about certain data practices. This includes collecting data types that users wouldn't reasonably expect, sharing data with undisclosed third parties, using data for purposes not mentioned in the privacy policy, or tracking users through hidden mechanisms like invisible pixels or device fingerprinting. The key distinction from misrepresentation is omission versus deception — the company didn't lie, it just didn't tell you.",
        relatedTerms: ["Misrepresentation of Practices"],
      },
      {
        term: "Health Breach Notification Failure",
        shortDescription:
          "The company failed to notify consumers or regulators after a health data breach.",
        fullDescription:
          "Under the FTC's Health Breach Notification Rule (2009), companies that handle personal health records outside of HIPAA's coverage must notify affected consumers, the FTC, and in some cases the media when a breach of unsecured health information occurs. This violation means the company experienced a breach involving health data and either failed to notify entirely, notified too late, or didn't notify all required parties. This is particularly important because health data is among the most sensitive categories of personal information and breaches can lead to discrimination, insurance denial, or personal embarrassment.",
        relatedTerms: ["Failure to Disclose Practices"],
      },
      {
        term: "Excessive Retention of Children's Data",
        shortDescription:
          "The company kept children's personal data longer than necessary or without proper justification.",
        fullDescription:
          "Under COPPA (Children's Online Privacy Protection Act) and similar laws, companies must only retain children's personal information for as long as reasonably necessary to fulfill the purpose for which it was collected. This violation means the company held onto data from children under 13 far beyond what was needed — sometimes indefinitely. This is especially concerning because children's data collected today could follow them for decades, and retention increases the risk of breaches. Companies must have clear data retention policies and actually follow them.",
        relatedTerms: [
          "Failure to Obtain Parental Consent",
          "Failure of Parent Control Over Children's Data",
        ],
      },
      {
        term: "Failure of Parent Control Over Children's Data",
        shortDescription:
          "The company did not give parents meaningful control over their children's information.",
        fullDescription:
          "COPPA requires that parents have the ability to review, correct, and delete their children's personal information, and to revoke consent for future data collection. This violation means the company made it difficult or impossible for parents to exercise these rights — for example, by not providing a way to access the data, ignoring deletion requests, or continuing to collect data after a parent withdrew consent. The principle is that parents, not companies, should be the gatekeepers of their children's digital footprint.",
        relatedTerms: [
          "Failure to Obtain Parental Consent",
          "Excessive Retention of Children's Data",
        ],
      },
      {
        term: "Failure to Obtain Parental Consent",
        shortDescription:
          "The company collected data from children under 13 without verifiable parental consent.",
        fullDescription:
          "COPPA requires companies to obtain verifiable parental consent before collecting personal information from children under 13. \"Verifiable\" means more than just clicking \"I am over 13\" — it requires methods like signed consent forms, credit card verification, video conferencing, or government ID checks. This violation means the company either didn't attempt to get consent at all, used a consent mechanism that was too easy to bypass (like a simple checkbox), or collected data from users it knew or should have known were children. This is one of the FTC's most actively enforced areas.",
        relatedTerms: [
          "Failure of Parent Control Over Children's Data",
          "Excessive Retention of Children's Data",
        ],
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
          "Failure to Obtain Parental Consent",
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
          "Failure to Disclose Practices",
          "Misrepresentation of Practices",
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
        relatedTerms: ["GDPR", "Failure to Disclose Practices"],
      },
    ],
  },
];
