import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { cases } from "@/data/cases";
import { ArrowLeft, ChevronDown, ChevronUp, FileText } from "lucide-react";

const CaseDetail = () => {
  const { id } = useParams();
  const case_ = cases.find((c) => c.id === id);
  const [revealedClaims, setRevealedClaims] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<"outcome" | "consequences" | "company" | "pdfs">("outcome");

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

  const tabs = [
    { key: "outcome" as const, label: "Outcome" },
    { key: "consequences" as const, label: "Consequences" },
    { key: "company" as const, label: "Company Now" },
    { key: "pdfs" as const, label: "Attached PDFs" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--detail-bg))", color: "hsl(var(--detail-foreground))" }}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b-[3px]" style={{ borderColor: "hsl(var(--detail-foreground) / 0.3)" }}>
        <Link to="/" className="border-2 px-4 py-2 text-xs font-mono font-bold uppercase hover:opacity-80 transition-colors flex items-center gap-2" style={{ borderColor: "hsl(var(--detail-foreground) / 0.4)", color: "hsl(var(--detail-foreground))" }}>
          <ArrowLeft className="w-4 h-4" /> Back to Cases
        </Link>
        <h2 className="text-xl font-bold tracking-tighter">THE PRIVACY JURY</h2>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Company hero section */}
        <section className="border-2 p-8" style={{ borderLeftWidth: "6px", borderLeftColor: "hsl(var(--accent))", background: "hsl(var(--info-box))", borderColor: "hsl(var(--info-box-foreground) / 0.2)", color: "hsl(var(--info-box-foreground))" }}>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight uppercase">{case_.company}</h1>
              <p className="text-lg font-mono mt-1" style={{ color: "hsl(var(--detail-muted))" }}>\{case_.country}</p>
              <p className="text-sm leading-relaxed mt-4">{case_.companyLongDescription}</p>
            </div>
            <div className="space-y-2 shrink-0">
              {[
                { label: "SECTOR", value: case_.sector },
                { label: "FOUNDING YEAR", value: case_.foundingYear.toString() },
                { label: "COMPANY WORTH", value: case_.companyWorth },
              ].map((item) => (
                <div key={item.label} className="border-2 px-4 py-3 min-w-[180px]" style={{ background: "hsl(var(--detail-bg))", borderColor: "hsl(var(--detail-foreground) / 0.3)", color: "hsl(var(--detail-foreground))" }}>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: "hsl(var(--detail-muted))" }}>{item.label}</p>
                  <p className="text-sm font-bold mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Case Information */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">\ CASE INFORMATION</h2>
          <div className="h-[3px] mb-4" style={{ background: "hsl(var(--detail-foreground) / 0.3)" }} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "JURISDICTION", value: case_.jurisdiction },
              { label: "COMPLAINT ISSUED", value: `${case_.complaintYear} – Decision ${case_.year}` },
              { label: "NUM IMPACTED", value: case_.impactedIndividuals },
            ].map((item) => (
              <div key={item.label} className="border-2 p-4" style={{ background: "hsl(var(--info-box))", borderColor: "hsl(var(--info-box-foreground) / 0.15)", color: "hsl(var(--info-box-foreground))" }}>
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: "hsl(var(--detail-muted))" }}>{item.label}</p>
                <p className="text-lg font-bold mt-1">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="border-2 px-5 py-3" style={{ background: "hsl(var(--info-box))", borderColor: "hsl(var(--info-box-foreground) / 0.15)", color: "hsl(var(--info-box-foreground))" }}>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: "hsl(var(--detail-muted))" }}>SEVERITY</p>
              <div className="flex gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`w-10 h-5 border-2 border-foreground ${i < case_.severityForIndividuals ? "severity-bar-fill" : "severity-bar-empty"}`} />
                ))}
              </div>
            </div>
            <div className="border-2 px-5 py-3" style={{ background: "hsl(var(--info-box))", borderColor: "hsl(var(--info-box-foreground) / 0.15)", color: "hsl(var(--info-box-foreground))" }}>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: "hsl(var(--detail-muted))" }}>FINE</p>
              <p className="text-2xl font-bold" style={{ color: "hsl(var(--accent))" }}>{case_.fineDisplay}</p>
            </div>
            <div className="border-2 px-5 py-3 flex-1" style={{ background: "hsl(var(--info-box))", borderColor: "hsl(var(--info-box-foreground) / 0.15)", color: "hsl(var(--info-box-foreground))" }}>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: "hsl(var(--detail-muted))" }}>VIOLATION TYPE</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {case_.violations.map((v) => (
                  <span key={v} className="text-xs font-mono font-bold" style={{ color: "hsl(var(--accent))" }}>{v}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Case Context */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">\ CASE OVERVIEW</h2>
          <div className="h-[3px] mb-4" style={{ background: "hsl(var(--detail-foreground) / 0.3)" }} />
          <div className="border-2 p-6" style={{ borderLeftWidth: "4px", borderLeftColor: "hsl(var(--accent))", background: "hsl(var(--info-box))", borderColor: "hsl(var(--info-box-foreground) / 0.15)", color: "hsl(var(--info-box-foreground))" }}>
            <p className="text-[15px] leading-relaxed">{case_.caseDescription}</p>
          </div>
          {case_.violations.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {case_.violations.map((v) => (
                <span key={v} className="border-2 px-3 py-1.5 text-xs font-mono font-bold uppercase" style={{ background: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent))", borderColor: "hsl(var(--accent) / 0.3)" }}>
                  ⚠️ {v}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Claim vs Reality */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-1">\ CLAIM vs REALITY</h2>
          <p className="text-sm mb-4" style={{ color: "hsl(var(--detail-muted))" }}>Click a claim to reveal the reality</p>
          <div className="h-[3px] mb-4" style={{ background: "hsl(var(--detail-foreground) / 0.3)" }} />
          <div className="space-y-3">
            {case_.claimsVsReality.map((cr, i) => (
              <div
                key={i}
                onClick={() => toggleClaim(i)}
                className="border-2 p-4 cursor-pointer hover:opacity-90 transition-colors"
                style={{ borderLeftWidth: "4px", borderLeftColor: revealedClaims.has(i) ? "hsl(var(--accent))" : "hsl(152, 60%, 30%)", background: "hsl(var(--info-box))", borderColor: "hsl(var(--info-box-foreground) / 0.15)", color: "hsl(var(--info-box-foreground))" }}
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
        </section>

        {/* Regulatory Findings */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">\ LEGAL FINDINGS</h2>
          <div className="h-[3px] mb-4" style={{ background: "hsl(var(--detail-foreground) / 0.3)" }} />
          {case_.regulatoryFindings.map((rf, i) => (
            <div key={i} className="border-2 p-5 mb-4" style={{ background: "hsl(var(--info-box))", borderColor: "hsl(var(--info-box-foreground) / 0.15)", color: "hsl(var(--info-box-foreground))" }}>
              <p className="text-xs font-mono font-bold">{rf.act}</p>
              <p className="text-sm mt-1 mb-3" style={{ color: "hsl(var(--detail-muted))" }}>{rf.description}</p>
              <div className="bg-primary text-primary-foreground p-3 mb-3">
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider">HOW THE COMPANY VIOLATED IT</p>
              </div>
              <ul className="space-y-2">
                {rf.violations.map((v, vi) => (
                  <li key={vi} className="text-sm pl-3 border-l-2 border-accent">{v}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {/* Tabs: Outcome, Consequences, Company Now, PDFs */}
        <section>
          <div className="flex" style={{ borderBottom: "3px solid hsl(var(--detail-foreground) / 0.3)" }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-colors border-[3px] border-b-0 -mb-[3px]`}
                style={{
                  background: activeTab === tab.key ? "hsl(var(--accent))" : "hsl(var(--info-box))",
                  color: activeTab === tab.key ? "hsl(var(--accent-foreground))" : "hsl(var(--info-box-foreground))",
                  borderColor: "hsl(var(--detail-foreground) / 0.3)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="border-2 border-t-0 p-6" style={{ background: "hsl(var(--info-box))", borderColor: "hsl(var(--detail-foreground) / 0.3)", color: "hsl(var(--info-box-foreground))" }}>
            {activeTab === "outcome" && <p className="text-sm leading-relaxed">{case_.outcome}</p>}
            {activeTab === "consequences" && <div className="text-sm leading-relaxed space-y-3"><p><span className="font-bold" style={{ color: "hsl(var(--accent))" }}>Fine: {case_.fineDisplay}</span></p><p>{case_.consequences}</p></div>}
            {activeTab === "company" && <p className="text-sm leading-relaxed">{case_.companyNow}</p>}
            {activeTab === "pdfs" && (
              <div>
                {case_.attachedPDFs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No attached PDFs for this case.</p>
                ) : (
                  <ul className="space-y-2">
                    {case_.attachedPDFs.map((pdf) => (
                      <li key={pdf} className="flex items-center gap-2 text-sm font-mono">
                        <FileText className="w-4 h-4 text-accent" />
                        {pdf}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default CaseDetail;
