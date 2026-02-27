import { useMemo } from "react";
import { cases, getDisplayCompany, parseCompanyWorth } from "@/data/cases";
import { Link } from "react-router-dom";
import TopNav from "@/components/TopNav";

const formatFine = (n: number): string => {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
};

const Leaderboard = () => {
  const stats = useMemo(() => {
    // Top companies by total fines
    const companyFines = new Map<string, { total: number; id: string; company: string }>();
    cases.forEach((c) => {
      const name = getDisplayCompany(c);
      const existing = companyFines.get(name);
      if (existing) {
        existing.total += c.fineAmount;
      } else {
        companyFines.set(name, { total: c.fineAmount, id: c.id, company: name });
      }
    });
    const topCompanies = [...companyFines.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Top jurisdictions by total fines
    const jurFines = new Map<string, number>();
    cases.forEach((c) => {
      jurFines.set(c.jurisdiction, (jurFines.get(c.jurisdiction) || 0) + c.fineAmount);
    });
    const topJurisdictions = [...jurFines.entries()]
      .map(([j, total]) => ({ jurisdiction: j, total }))
      .sort((a, b) => b.total - a.total);

    // Most common violation type
    const violationCounts = new Map<string, number>();
    cases.forEach((c) => {
      c.violations.forEach((v) => violationCounts.set(v, (violationCounts.get(v) || 0) + 1));
    });
    const topViolation = [...violationCounts.entries()].sort((a, b) => b[1] - a[1])[0];

    // Largest single fine
    const largestFineCase = [...cases].sort((a, b) => b.fineAmount - a.fineAmount)[0];

    // Average fine per jurisdiction
    const jurCounts = new Map<string, number>();
    cases.forEach((c) => {
      jurCounts.set(c.jurisdiction, (jurCounts.get(c.jurisdiction) || 0) + 1);
    });
    const avgFinePerJurisdiction = [...jurFines.entries()].map(([j, total]) => ({
      jurisdiction: j,
      avg: total / (jurCounts.get(j) || 1),
    })).sort((a, b) => b.avg - a.avg);

    return { topCompanies, topJurisdictions, topViolation, largestFineCase, avgFinePerJurisdiction };
  }, []);

  return (
    <div className="min-h-screen bg-background loot-drop-page" style={{ backgroundColor: "#F5F3EF" }}>
      <TopNav />

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        <header className="text-center">
          <h1 className="hero-title text-5xl sm:text-6xl font-bold tracking-tighter uppercase">
            Leaderboard
          </h1>
          <p className="text-sm font-mono text-muted-foreground mt-2">
            The stats vault — aggregated enforcement data across {cases.length} cases
          </p>
        </header>

        {/* Highlight stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="brutalist-border info-box p-5 text-center">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Largest Single Fine
            </p>
            <p className="text-3xl font-bold mt-1" style={{ color: "hsl(var(--accent))" }}>
              {stats.largestFineCase ? formatFine(stats.largestFineCase.fineAmount) : "—"}
            </p>
            {stats.largestFineCase && (
              <Link
                to={`/case/${stats.largestFineCase.id}`}
                className="text-xs font-mono text-muted-foreground hover:text-foreground underline mt-1 inline-block"
              >
                {getDisplayCompany(stats.largestFineCase)}
              </Link>
            )}
          </div>
          <div className="brutalist-border info-box p-5 text-center">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Total Fines Issued
            </p>
            <p className="text-3xl font-bold mt-1" style={{ color: "hsl(var(--accent))" }}>
              {formatFine(cases.reduce((sum, c) => sum + c.fineAmount, 0))}
            </p>
            <p className="text-xs font-mono text-muted-foreground mt-1">across {cases.length} cases</p>
          </div>
          <div className="brutalist-border info-box p-5 text-center">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Most Common Violation
            </p>
            <p className="text-lg font-bold mt-1">{stats.topViolation?.[0] || "—"}</p>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              {stats.topViolation?.[1] || 0} cases
            </p>
          </div>
        </div>

        {/* Top Companies */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-1 uppercase">\ Top Companies by Total Fines</h2>
          <div className="h-[3px] bg-border mb-4" />
          <div className="space-y-2">
            {stats.topCompanies.map((c, i) => (
              <Link
                key={c.company}
                to={`/case/${c.id}`}
                className={`flex items-center gap-4 brutalist-border p-4 transition-all hover:translate-x-1 ${
                  i === 0 ? "bg-[#FFD700]/20 border-[#FFD700]" : "bg-card"
                }`}
                style={i === 0 ? { borderColor: "#D4A800", borderWidth: "4px" } : {}}
              >
                <span
                  className={`w-8 h-8 flex items-center justify-center font-bold text-sm font-mono shrink-0 border-2 border-black ${
                    i === 0 ? "bg-[#FFD700] text-black" : i === 1 ? "bg-gray-300 text-black" : i === 2 ? "bg-orange-300 text-black" : "bg-card"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="flex-1 font-bold text-lg">{c.company}</span>
                <span className="font-mono font-bold text-sm" style={{ color: "hsl(var(--accent))" }}>
                  {formatFine(c.total)}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Top Jurisdictions */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-1 uppercase">\ Top Jurisdictions by Total Fines</h2>
          <div className="h-[3px] bg-border mb-4" />
          <div className="space-y-2">
            {stats.topJurisdictions.map((j, i) => (
              <div
                key={j.jurisdiction}
                className={`flex items-center gap-4 brutalist-border p-4 ${
                  i === 0 ? "bg-[#FFD700]/20" : "bg-card"
                }`}
                style={i === 0 ? { borderColor: "#D4A800", borderWidth: "4px" } : {}}
              >
                <span
                  className={`w-8 h-8 flex items-center justify-center font-bold text-sm font-mono shrink-0 border-2 border-black ${
                    i === 0 ? "bg-[#FFD700] text-black" : "bg-card"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="flex-1 font-bold">{j.jurisdiction}</span>
                <span className="font-mono font-bold text-sm" style={{ color: "hsl(var(--accent))" }}>
                  {formatFine(j.total)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Average Fine per Jurisdiction */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-1 uppercase">\ Average Fine per Jurisdiction</h2>
          <div className="h-[3px] bg-border mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats.avgFinePerJurisdiction.map((j) => (
              <div key={j.jurisdiction} className="brutalist-border bg-card p-4 flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase">{j.jurisdiction}</span>
                <span className="font-mono font-bold text-sm" style={{ color: "hsl(var(--accent))" }}>
                  {formatFine(j.avg)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Leaderboard;
