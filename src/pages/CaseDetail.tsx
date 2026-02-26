import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { cases, formatCompanyWorth, getDisplayCompany, getFineDisplay, truncateToMaxSentences } from "@/data/cases";
import { ArrowLeft, ChevronDown, ChevronUp, FileText, Plus, Minus } from "lucide-react";

const CONSEQUENCE_EXPLANATIONS: Record<string, string> = {
  "injunctive relief sought": "Injunctive relief is a court order requiring a party to do or stop doing something. When sought by a regulator, it means the agency is asking a court to order the company to change its behaviour (e.g. stop a practice) or take specific steps, rather than only paying a fine.",
  "consent order": "A consent order is a binding agreement between the regulator and the company. The company agrees to certain terms (e.g. change practices, implement a program) without admitting liability. Failure to comply can lead to further enforcement.",
  "compliance order": "A compliance order requires the company to take specific actions to comply with the law—for example, updating policies, implementing safeguards, or submitting to monitoring. It is aimed at changing future behaviour.",
  "reprimand": "A reprimand is an official warning or censure. It is a formal finding of a breach without a monetary penalty, often used when the breach is less serious or the organisation has taken steps to remedy the issue.",
  "no penalty": "No monetary penalty was imposed. The regulator may have issued a warning, closed the case, or required non-financial remedies such as corrective measures or an undertaking.",
  "complaint issued": "A formal complaint has been filed by the regulator. The case may be ongoing; no final decision or penalty may have been reached yet.",
};

const CaseDetail = () => {
  const { id } = useParams();
  const case_ = cases.find((c) => c.id === id);
  const [revealedClaims, setRevealedClaims] = useState<Set<number>>(new Set());
  const [claimVsRealityOpen, setClaimVsRealityOpen] = useState(false);
  const [legalFindingsOpen, setLegalFindingsOpen] = useState(false);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [pdfsOpen, setPdfsOpen] = useState(false);

  if (!case_) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="brutalist-border bg-card p-12 text-center">
          <p className="text-lg font-bold">Case not found.</p>
          <Link to="/" className="text-accent underline mt-2 inline-block">Back to cases</Link>
        </div>
      </div>
    );
  }

  const toggleClaim = (index: number) => {
    setRevealedClaims((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background case-detail-page">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b-4 border-border bg-[#FFD700] text-black">
        <Link to="/" className="brutalist-border bg-white px-4 py-2 text-xs font-mono font-bold uppercase hover:bg-black hover:text-white transition-colors flex items-center gap-2 text-black border-2 border-black">
          <ArrowLeft className="w-4 h-4" /> Back to Cases
        </Link>
        <h2 className="text-xl font-bold tracking-tighter">THE PRIVACY JURY</h2>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Company hero section */}
        <section className="brutalist-border info-box p-8" style={{ borderLeftWidth: "6px", borderLeftColor: "hsl(var(--accent))" }}>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight uppercase">{getDisplayCompany(case_)}</h1>
              {case_.country && (
                <p className="text-lg font-mono text-muted-foreground mt-1">{case_.country}</p>
              )}
              <p className="text-sm leading-relaxed mt-4">{case_.companyLongDescription || case_.companyDescription || "No company synopsis available."}</p>
            </div>
            <div className="space-y-2 shrink-0 flex flex-col items-stretch">
              {[
                { label: "SECTOR", value: case_.sector },
                { label: "FOUNDING YEAR", value: case_.foundingYear ? case_.foundingYear.toString() : "—" },
                { label: "COMPANY WORTH", value: formatCompanyWorth(case_.companyWorth) },
              ].map((item) => (
                <div key={item.label} className="detail-yellow-box px-4 py-3 w-[180px] min-w-[180px] max-w-[180px]">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-bold mt-0.5 truncate" title={item.value}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Case Information */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">\ CASE INFORMATION</h2>
          <div className="h-[3px] bg-border mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "JURISDICTION", value: case_.jurisdiction },
              { label: "COMPLAINT ISSUED", value: `${case_.complaintYear} – Decision ${case_.year}` },
              { label: "NUM IMPACTED", value: case_.impactedIndividuals || "Unknown" },
            ].map((item) => (
              <div key={item.label} className="detail-yellow-box p-4">
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                <p className="text-lg font-bold mt-1">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="detail-yellow-box px-5 py-3">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">SEVERITY</p>
              <div className="flex gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`w-10 h-5 border-2 border-border ${i < case_.severityForIndividuals ? "severity-bar-fill" : "severity-bar-empty"}`} />
                ))}
              </div>
            </div>
            <div className="detail-yellow-box px-5 py-3">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">FINE</p>
              <p className={`font-bold ${getFineDisplay(case_) === "No fine" ? "text-base" : "text-lg"}`} style={{ color: "#000" }}>{getFineDisplay(case_)}</p>
            </div>
            <div className="detail-yellow-box px-5 py-3 flex-1">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">VIOLATION TYPE</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {case_.violations.length > 0 ? case_.violations.map((v) => (
                  <span key={v} className="text-xs font-mono font-bold text-black">{v}</span>
                )) : <span className="text-xs text-muted-foreground">—</span>}
              </div>
            </div>
          </div>
        </section>

        {/* Case Context */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">\ CASE OVERVIEW</h2>
          <div className="h-[3px] bg-border mb-4" />
          <div className="brutalist-border info-box p-6">
            <p className="text-[15px] leading-relaxed">{case_.caseDescription || "No case overview available."}</p>
          </div>
          {case_.violations.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {case_.violations.map((v) => (
                <span key={v} className="brutalist-border px-3 py-1.5 text-xs font-mono font-bold uppercase" style={{ background: "hsl(var(--accent) / 0.1)", color: "hsl(var(--accent))" }}>
                  ⚠️ {v}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Claim vs Reality – loot-drop: click header to expand */}
        <section>
          <button
            type="button"
            className="loot-drop-accordion-header"
            onClick={() => setClaimVsRealityOpen((open) => !open)}
          >
            <span className="loot-drop-circle">{claimVsRealityOpen ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}</span>
            <span className="loot-drop-accordion-title">Claim vs Reality</span>
            {claimVsRealityOpen ? <Minus className="w-6 h-6 shrink-0" /> : <Plus className="w-6 h-6 shrink-0" />}
          </button>
          {claimVsRealityOpen && (
            <div className="loot-drop-accordion-content">
              <p className="text-sm text-muted-foreground mb-3">Click a claim to reveal the reality</p>
              {case_.claimsVsReality.length === 0 ? (
                <p className="text-sm text-muted-foreground">No claims vs reality documented for this case.</p>
              ) : (
                <div className="space-y-4">
                  {case_.claimsVsReality.map((cr, i) => (
                    <div
                      key={i}
                      onClick={() => toggleClaim(i)}
                      className="brutalist-border info-box p-4 cursor-pointer hover:opacity-90 transition-colors"
                      style={{ borderLeftWidth: "4px", borderLeftColor: revealedClaims.has(i) ? "hsl(var(--accent))" : "hsl(var(--label-green))" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-[10px] font-mono font-bold uppercase tracking-wider mb-1" style={{ color: "hsl(var(--label-green))" }}>CLAIM</p>
                          <p className="text-sm font-medium">{cr.claim}</p>
                        </div>
                        {revealedClaims.has(i) ? <ChevronUp className="w-5 h-5 shrink-0 text-accent" /> : <ChevronDown className="w-5 h-5 shrink-0 text-muted-foreground" />}
                      </div>
                      {revealedClaims.has(i) && (
                        <div className="mt-3 pt-3 border-t border-muted-foreground/20">
                          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent mb-1">REALITY</p>
                          <p className="text-sm font-bold" style={{ color: "hsl(var(--accent))" }}>{cr.reality}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Legal Findings – loot-drop: click header to expand */}
        <section>
          <button
            type="button"
            className="loot-drop-accordion-header"
            onClick={() => setLegalFindingsOpen((open) => !open)}
          >
            <span className="loot-drop-circle">{legalFindingsOpen ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}</span>
            <span className="loot-drop-accordion-title">Legal Findings</span>
            {legalFindingsOpen ? <Minus className="w-6 h-6 shrink-0" /> : <Plus className="w-6 h-6 shrink-0" />}
          </button>
          {legalFindingsOpen && (
            <div className="loot-drop-accordion-content">
              {case_.regulatoryFindings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No legal findings documented for this case.</p>
              ) : (
                case_.regulatoryFindings.map((rf, i) => (
                  <div key={i} className="brutalist-border info-box p-5 mb-4">
                    <p className="text-xs font-mono font-bold">{rf.act}</p>
                    <div className="mt-2 mb-3">
                      <p className="text-[10px] font-mono font-bold uppercase tracking-wider">HOW THE COMPANY VIOLATED IT</p>
                    </div>
                    <ul className="space-y-2">
                      {rf.violations.map((v, vi) => (
                        <li key={vi} className="text-sm pl-3 border-l-2 border-accent">{v}</li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Outcome (includes Company Now) – loot-drop dropdown */}
        <section>
          <button
            type="button"
            className="loot-drop-accordion-header"
            onClick={() => setOutcomeOpen((open) => !open)}
          >
            <span className="loot-drop-circle">{outcomeOpen ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}</span>
            <span className="loot-drop-accordion-title">Outcome</span>
            {outcomeOpen ? <Minus className="w-6 h-6 shrink-0" /> : <Plus className="w-6 h-6 shrink-0" />}
          </button>
          {outcomeOpen && (
            <div className="loot-drop-accordion-content text-sm leading-relaxed space-y-4">
              <div className="space-y-3">
                <p>{case_.outcome || "No outcome documented for this case."}</p>
                {getFineDisplay(case_) !== "No fine" ? (
                  <p><span className="font-bold" style={{ color: "hsl(var(--accent))" }}>Fine: {getFineDisplay(case_)}</span></p>
                ) : (
                  <p><span className="font-bold" style={{ color: "hsl(var(--accent))" }}>{case_.outcomeSummary || "No monetary penalty"}</span></p>
                )}
                {case_.consequences && <p>{case_.consequences}</p>}
                {case_.outcomeSummary && CONSEQUENCE_EXPLANATIONS[case_.outcomeSummary.toLowerCase()] && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="font-mono font-bold text-[10px] uppercase tracking-wider text-muted-foreground mb-1">What does this mean?</p>
                    <p className="text-muted-foreground">{CONSEQUENCE_EXPLANATIONS[case_.outcomeSummary.toLowerCase()]}</p>
                  </div>
                )}
              </div>
              <div className="pt-3 border-t border-border">
                <p className="font-mono font-bold text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Company Now</p>
                <p>{case_.companyNow || "No company-now information for this case."}</p>
              </div>
            </div>
          )}
        </section>

        {/* Attached PDFs – loot-drop dropdown */}
        <section>
          <button
            type="button"
            className="loot-drop-accordion-header"
            onClick={() => setPdfsOpen((open) => !open)}
          >
            <span className="loot-drop-circle">{pdfsOpen ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}</span>
            <span className="loot-drop-accordion-title">Attached PDFs</span>
            {pdfsOpen ? <Minus className="w-6 h-6 shrink-0" /> : <Plus className="w-6 h-6 shrink-0" />}
          </button>
          {pdfsOpen && (
            <div className="loot-drop-accordion-content">
              {case_.attachedPDFs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attached PDFs for this case.</p>
              ) : (
                <ul className="space-y-2">
                  {case_.attachedPDFs.map((pdf, i) => {
                    const href = typeof pdf === "string" ? pdf : pdf.url;
                    const label = typeof pdf === "string" ? pdf : (pdf.label || pdf.url || "");
                    const hasUrl = href && href.startsWith("http");
                    return (
                      <li key={String(label) + i} className="flex items-center gap-2 text-sm font-mono">
                        <FileText className="w-4 h-4 text-accent shrink-0" />
                        {hasUrl ? (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline break-all">{label}</a>
                        ) : (
                          <span className="break-all">{label || "Source document"}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CaseDetail;
