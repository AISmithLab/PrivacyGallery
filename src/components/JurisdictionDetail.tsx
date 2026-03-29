import { useMemo, useState } from "react";
import { Plus, Minus } from "lucide-react";
import { cases, getDisplayCompany, getOutcomeType, type Jurisdiction } from "@/data/cases";
import { JURISDICTION_INFO } from "@/data/jurisdictionInfo";
import { JurisdictionLogo } from "./JurisdictionLogos";

interface JurisdictionDetailProps {
  jurisdiction: Jurisdiction;
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

/** Format outcome for the table — show fine amount for Monetary Penalty */
function formatOutcome(outcome: string, fine: number): string {
  if (outcome === "Monetary Penalty" && fine > 0) {
    return `${formatCurrency(fine)} fine`;
  }
  return outcome;
}

export default function JurisdictionDetail({ jurisdiction }: JurisdictionDetailProps) {
  const info = JURISDICTION_INFO[jurisdiction];
  const [lawsOpen, setLawsOpen] = useState(false);

  const stats = useMemo(() => {
    const jCases = cases.filter((c) => c.jurisdiction === jurisdiction);
    const totalCases = jCases.length;
    const years = jCases.map((c) => c.year).filter((y) => y > 0).sort((a, b) => a - b);
    const minYear = years[0] || 0;
    const maxYear = years[years.length - 1] || 0;

    const violationCounts: Record<string, number> = {};
    for (const c of jCases) {
      for (const v of c.violations) {
        violationCounts[v] = (violationCounts[v] || 0) + 1;
      }
    }
    const topViolations = Object.entries(violationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const outcomeCounts: Record<string, number> = {};
    for (const c of jCases) {
      const outcome = getOutcomeType(c);
      outcomeCounts[outcome] = (outcomeCounts[outcome] || 0) + 1;
    }
    const topOutcomes = Object.entries(outcomeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const casesWithFines = jCases.filter((c) => c.fineAmount > 0);
    const totalFines = casesWithFines.reduce((sum, c) => sum + c.fineAmount, 0);
    const avgFine = casesWithFines.length > 0 ? totalFines / casesWithFines.length : 0;
    const maxFine = casesWithFines.length > 0 ? Math.max(...casesWithFines.map((c) => c.fineAmount)) : 0;
    const pctMonetary = totalCases > 0 ? Math.round((casesWithFines.length / totalCases) * 100) : 0;

    const sectorCounts: Record<string, number> = {};
    for (const c of jCases) {
      sectorCounts[c.sector] = (sectorCounts[c.sector] || 0) + 1;
    }
    const topSectors = Object.entries(sectorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const topCompanies = [...jCases]
      .sort((a, b) => b.fineAmount - a.fineAmount)
      .slice(0, 5)
      .map((c) => ({
        name: getDisplayCompany(c),
        fine: c.fineAmount,
        year: c.year,
        outcome: getOutcomeType(c),
      }));

    return {
      totalCases, minYear, maxYear,
      topViolations, topOutcomes,
      totalFines, avgFine, maxFine, pctMonetary,
      topSectors, topCompanies,
    };
  }, [jurisdiction]);

  return (
    <div className="border-2 border-black bg-card brutalist-shadow animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header — matches CaseDetail h1 style: text-4xl/5xl font-bold */}
      <div className="px-6 py-5 border-b-2 border-black bg-card">
        <div className="flex items-center gap-5">
          <JurisdictionLogo jurisdiction={jurisdiction} className="w-16 h-16 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight uppercase">
              {info.fullName}
            </h1>
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground mt-1">
              {info.abbreviation}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-10">
        {/* 1. Overview */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">\ OVERVIEW</h2>
          <div className="h-[3px] bg-border mb-4" />
          <p className="text-[15px] leading-relaxed">{info.overview}</p>
        </section>

        {/* 2. Enforcement Style — plain text, no box */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">\ ENFORCEMENT STYLE</h2>
          <div className="h-[3px] bg-border mb-4" />
          <p className="text-[15px] leading-relaxed">{info.enforcementStyle}</p>
        </section>

        {/* 3. Main Privacy Laws — loot-drop accordion, no dashed line after */}
        <section>
          <button
            type="button"
            className="loot-drop-accordion-header"
            onClick={() => setLawsOpen((o) => !o)}
          >
            <span className="loot-drop-circle">
              {lawsOpen ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </span>
            <span className="loot-drop-accordion-title">Main Privacy Laws</span>
            {lawsOpen ? <Minus className="w-6 h-6 shrink-0" /> : <Plus className="w-6 h-6 shrink-0" />}
          </button>
          {lawsOpen && (
            <div className="loot-drop-accordion-content space-y-4">
              {info.laws.map((law) => (
                <div key={law.name} className="brutalist-border info-box p-4" style={{ borderLeftWidth: "4px", borderLeftColor: "#FFD700" }}>
                  <p className="text-sm font-bold">
                    {law.name} <span className="font-normal opacity-60">({law.year})</span>
                  </p>
                  <p className="text-sm leading-relaxed mt-2 opacity-80">{law.description}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. From Our Dataset */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">\ FROM OUR DATASET</h2>
          <div className="h-[3px] bg-border mb-4" />
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground mb-6">
            {stats.totalCases} cases · {stats.minYear}–{stats.maxYear}
          </p>

          {/* Bar charts grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <BarSection title="Top Sectors Affected" data={stats.topSectors} total={stats.totalCases} />
            <BarSection title="Most Common Violations" data={stats.topViolations} total={stats.totalCases} />
            <div className="md:col-span-2">
              <BarSection title="Most Common Outcomes" data={stats.topOutcomes} total={stats.totalCases} />
            </div>
          </div>

          {/* Top Companies table */}
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground mb-3">Top Companies</p>
          <div className="border-2 border-black">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black" style={{ backgroundColor: "#FFD700" }}>
                  <th className="text-left px-4 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest">Company</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest">Outcome</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest">Year</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {stats.topCompanies.map((c, i) => (
                  <tr key={c.name + c.year} className={`border-b border-border ${i % 2 === 0 ? "bg-card" : "bg-background"}`}>
                    <td className="px-4 py-2.5 font-bold">{c.name}</td>
                    <td className="px-4 py-2.5 text-right text-xs">{formatOutcome(c.outcome, c.fine)}</td>
                    <td className="px-4 py-2.5 text-right">{c.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

/** Bar chart section with a label header and proportional bars */
function BarSection({ title, data, total }: { title: string; data: [string, number][]; total: number }) {
  const maxCount = data.length > 0 ? data[0][1] : 1;
  return (
    <div>
      <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground mb-3">{title}</p>
      <div className="space-y-3">
        {data.map(([label, count]) => {
          const barPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
          return (
            <div key={label}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-sm font-bold truncate">{label}</span>
                <span className="text-xs font-mono font-bold ml-2 shrink-0">{count}</span>
              </div>
              <div className="h-2.5 overflow-hidden" style={{ backgroundColor: "#e5e5e5" }}>
                <div className="h-full transition-all duration-500" style={{ width: `${barPct}%`, backgroundColor: "#FFD700", border: "1px solid black" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
