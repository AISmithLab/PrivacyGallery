import { useMemo } from "react";
import { cases, getDisplayCompany, type Jurisdiction } from "@/data/cases";
import { JURISDICTION_INFO } from "@/data/jurisdictionInfo";

interface JurisdictionDetailProps {
  jurisdiction: Jurisdiction;
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

export default function JurisdictionDetail({ jurisdiction }: JurisdictionDetailProps) {
  const info = JURISDICTION_INFO[jurisdiction];

  const stats = useMemo(() => {
    const jCases = cases.filter((c) => c.jurisdiction === jurisdiction);
    const totalCases = jCases.length;
    const years = jCases.map((c) => c.year).filter((y) => y > 0).sort((a, b) => a - b);
    const minYear = years[0] || 0;
    const maxYear = years[years.length - 1] || 0;

    // Violation counts
    const violationCounts: Record<string, number> = {};
    for (const c of jCases) {
      for (const v of c.violations) {
        violationCounts[v] = (violationCounts[v] || 0) + 1;
      }
    }
    const topViolations = Object.entries(violationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Outcome counts
    const outcomeCounts: Record<string, number> = {};
    for (const c of jCases) {
      const outcome = c.outcomeSummary || "Unknown";
      outcomeCounts[outcome] = (outcomeCounts[outcome] || 0) + 1;
    }
    const topOutcomes = Object.entries(outcomeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Severity
    const casesWithFines = jCases.filter((c) => c.fineAmount > 0);
    const totalFines = casesWithFines.reduce((sum, c) => sum + c.fineAmount, 0);
    const avgFine = casesWithFines.length > 0 ? totalFines / casesWithFines.length : 0;
    const maxFine = casesWithFines.length > 0 ? Math.max(...casesWithFines.map((c) => c.fineAmount)) : 0;
    const pctMonetary = totalCases > 0 ? Math.round((casesWithFines.length / totalCases) * 100) : 0;

    // Sector counts
    const sectorCounts: Record<string, number> = {};
    for (const c of jCases) {
      sectorCounts[c.sector] = (sectorCounts[c.sector] || 0) + 1;
    }
    const topSectors = Object.entries(sectorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Top companies by fine
    const topCompanies = [...jCases]
      .sort((a, b) => b.fineAmount - a.fineAmount)
      .slice(0, 5)
      .map((c) => ({ name: getDisplayCompany(c), fine: c.fineAmount, year: c.year }));

    return {
      totalCases,
      minYear,
      maxYear,
      topViolations,
      topOutcomes,
      totalFines,
      avgFine,
      maxFine,
      pctMonetary,
      topSectors,
      topCompanies,
    };
  }, [jurisdiction]);

  return (
    <div className="border-2 border-black bg-card brutalist-shadow animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="px-6 py-5 border-b-2 border-black" style={{ backgroundColor: info.color + "1A" }}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{info.flag}</span>
          <div>
            <h2 className="text-2xl font-bold tracking-tight uppercase">{info.fullName}</h2>
            <span className="text-xs font-mono font-bold uppercase tracking-wider opacity-60">
              {info.abbreviation}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Overview */}
        <Section title="Overview">
          <p className="text-sm leading-relaxed">{info.overview}</p>
        </Section>

        {/* Main Privacy Laws */}
        <Section title="Main Privacy Laws">
          <div className="space-y-3">
            {info.laws.map((law) => (
              <div key={law.name} className="border-l-4 border-black pl-4">
                <p className="text-sm font-bold">
                  {law.name} <span className="font-normal opacity-60">({law.year})</span>
                </p>
                <p className="text-xs leading-relaxed mt-1 opacity-80">{law.description}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Enforcement Authority */}
        <Section title="Enforcement Authority">
          <div className="border-l-4 border-black pl-4">
            <p className="text-sm font-bold">
              {info.authority.name}{" "}
              <span className="font-normal opacity-60">({info.authority.acronym})</span>
            </p>
            <p className="text-xs leading-relaxed mt-1 opacity-80">{info.authority.role}</p>
          </div>
        </Section>

        {/* Enforcement Style */}
        <Section title="Enforcement Style">
          <p className="text-sm leading-relaxed">{info.enforcementStyle}</p>
        </Section>

        <div className="border-t-2 border-dashed border-border" />

        {/* Dataset Stats Header */}
        <div>
          <h3 className="text-lg font-bold uppercase tracking-wider mb-1">From Our Dataset</h3>
          <p className="text-xs font-mono opacity-60">
            {stats.totalCases} cases · {stats.minYear}–{stats.maxYear}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Severity Snapshot */}
          <Section title="Severity Snapshot">
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Total Fines" value={formatCurrency(stats.totalFines)} />
              <StatBox label="Largest Fine" value={formatCurrency(stats.maxFine)} />
              <StatBox label="Avg Fine" value={formatCurrency(stats.avgFine)} />
              <StatBox label="% Monetary" value={`${stats.pctMonetary}%`} />
            </div>
          </Section>

          {/* Top Sectors */}
          <Section title="Top Sectors Affected">
            <div className="space-y-1.5">
              {stats.topSectors.map(([sector, count]) => (
                <BarRow key={sector} label={sector} count={count} total={stats.totalCases} />
              ))}
            </div>
          </Section>

          {/* Most Common Violations */}
          <Section title="Most Common Violations">
            <div className="space-y-1.5">
              {stats.topViolations.map(([violation, count]) => (
                <BarRow key={violation} label={violation} count={count} total={stats.totalCases} />
              ))}
            </div>
          </Section>

          {/* Most Common Outcomes */}
          <Section title="Most Common Outcomes">
            <div className="space-y-1.5">
              {stats.topOutcomes.map(([outcome, count]) => (
                <BarRow key={outcome} label={outcome} count={count} total={stats.totalCases} />
              ))}
            </div>
          </Section>
        </div>

        {/* Top Companies */}
        <Section title="Top Companies by Fine">
          <div className="border-2 border-border">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="border-b-2 border-border bg-background">
                  <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wider">Company</th>
                  <th className="text-right px-3 py-2 text-xs font-bold uppercase tracking-wider">Fine</th>
                  <th className="text-right px-3 py-2 text-xs font-bold uppercase tracking-wider">Year</th>
                </tr>
              </thead>
              <tbody>
                {stats.topCompanies.map((c, i) => (
                  <tr key={c.name + c.year} className={i % 2 === 0 ? "bg-card" : "bg-background"}>
                    <td className="px-3 py-2 font-bold">{c.name}</td>
                    <td className="px-3 py-2 text-right">
                      {c.fine > 0 ? formatCurrency(c.fine) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">{c.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-mono font-bold uppercase tracking-wider mb-2 opacity-60">{title}</h4>
      {children}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-border p-3 text-center">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs font-mono opacity-60 mt-0.5">{label}</p>
    </div>
  );
}

function BarRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-0.5">
          <span className="text-xs font-mono truncate">{label}</span>
          <span className="text-xs font-mono font-bold ml-2 shrink-0">{count}</span>
        </div>
        <div className="h-1.5 bg-border rounded-sm overflow-hidden">
          <div
            className="h-full bg-black rounded-sm transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
