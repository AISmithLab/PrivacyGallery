import { useState, useMemo } from "react";
import { cases, JURISDICTIONS, VIOLATION_TYPES, SECTORS, type EnforcementCase, type Jurisdiction, type ViolationType, type Sector, getDisplayCompany } from "@/data/cases";
import TopNav from "@/components/TopNav";
import { Link } from "react-router-dom";

/* ────────── helpers ────────── */

const formatFine = (n: number): string => {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  if (n === 0) return "—";
  return `$${n.toLocaleString()}`;
};

type GroupKey = "violation" | "jurisdiction" | "sector";
type ViewMode = "matrix" | "side-by-side" | "patterns";

const groupLabels: Record<GroupKey, string> = {
  violation: "Violation Type",
  jurisdiction: "Jurisdiction",
  sector: "Sector",
};

/* ────────── component ────────── */

const Compare = () => {
  const [view, setView] = useState<ViewMode>("matrix");
  const [groupBy, setGroupBy] = useState<GroupKey>("violation");
  const [filterJurisdiction, setFilterJurisdiction] = useState<Jurisdiction | "">("");
  const [filterViolation, setFilterViolation] = useState<ViolationType | "">("");
  const [filterSector, setFilterSector] = useState<Sector | "">("");
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);

  /* Filtered dataset */
  const filtered = useMemo(() => {
    return cases.filter((c) => {
      if (filterJurisdiction && c.jurisdiction !== filterJurisdiction) return false;
      if (filterViolation && !c.violations.includes(filterViolation)) return false;
      if (filterSector && c.sector !== filterSector) return false;
      return true;
    });
  }, [filterJurisdiction, filterViolation, filterSector]);

  /* ── Matrix data: violations × jurisdictions ── */
  const matrixData = useMemo(() => {
    const jurisdictions = JURISDICTIONS.filter((j) => filtered.some((c) => c.jurisdiction === j));
    const violations = VIOLATION_TYPES.filter((v) => filtered.some((c) => c.violations.includes(v)));

    const cells = new Map<string, { cases: EnforcementCase[]; avgFine: number; count: number }>();
    violations.forEach((v) => {
      jurisdictions.forEach((j) => {
        const matching = filtered.filter((c) => c.jurisdiction === j && c.violations.includes(v));
        const avg = matching.length ? matching.reduce((s, c) => s + c.fineAmount, 0) / matching.length : 0;
        cells.set(`${v}|${j}`, { cases: matching, avgFine: avg, count: matching.length });
      });
    });

    return { jurisdictions, violations, cells };
  }, [filtered]);

  /* ── Pattern data: group by violation type and compare across jurisdictions ── */
  const patterns = useMemo(() => {
    const byViolation = new Map<string, EnforcementCase[]>();
    filtered.forEach((c) => {
      c.violations.forEach((v) => {
        const arr = byViolation.get(v) || [];
        arr.push(c);
        byViolation.set(v, arr);
      });
    });

    return [...byViolation.entries()]
      .map(([violation, cs]) => {
        const byJuris = new Map<string, { cases: EnforcementCase[]; avgFine: number; maxFine: number; outcomes: string[] }>();
        cs.forEach((c) => {
          const existing = byJuris.get(c.jurisdiction) || { cases: [], avgFine: 0, maxFine: 0, outcomes: [] };
          existing.cases.push(c);
          existing.maxFine = Math.max(existing.maxFine, c.fineAmount);
          const outcome = c.outcomeSummary || (c.fineAmount > 0 ? "Monetary fine" : "Non-monetary");
          if (!existing.outcomes.includes(outcome)) existing.outcomes.push(outcome);
          byJuris.set(c.jurisdiction, existing);
        });
        byJuris.forEach((v) => {
          v.avgFine = v.cases.reduce((s, c) => s + c.fineAmount, 0) / v.cases.length;
        });

        const commonFindings: string[] = [];
        cs.forEach((c) => {
          c.regulatoryFindings?.forEach((f) => {
            if (!commonFindings.includes(f.act) && commonFindings.length < 5) commonFindings.push(f.act);
          });
        });

        return { violation, totalCases: cs.length, jurisdictions: byJuris, commonFindings };
      })
      .sort((a, b) => b.totalCases - a.totalCases);
  }, [filtered]);

  /* Toggle case for side-by-side */
  const toggleCase = (id: string) => {
    setSelectedCases((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const selectedCaseObjects = cases.filter((c) => selectedCases.includes(c.id));

  /* ────────── severity color ────────── */
  const severityColor = (sev: number) => {
    if (sev >= 8) return "#dc2626";
    if (sev >= 5) return "#f59e0b";
    return "#22c55e";
  };

  const heatColor = (count: number, maxCount: number) => {
    if (count === 0) return "transparent";
    const intensity = Math.min(count / Math.max(maxCount, 1), 1);
    if (intensity > 0.7) return "rgba(220, 38, 38, 0.25)";
    if (intensity > 0.3) return "rgba(245, 158, 11, 0.15)";
    return "rgba(34, 197, 94, 0.1)";
  };

  const maxCellCount = useMemo(() => {
    let max = 0;
    matrixData.cells.forEach((v) => { if (v.count > max) max = v.count; });
    return max;
  }, [matrixData]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav />

      {/* Hero */}
      <div className="border-b-4 border-border py-10 text-center" style={{ background: "#FFD700" }}>
        <h1
          className="text-5xl sm:text-7xl font-bold tracking-tighter uppercase"
          style={{ fontFamily: "'Anton', sans-serif", color: "#000" }}
        >
          Compare Enforcement
        </h1>
        <p className="mt-2 text-sm font-mono uppercase tracking-widest text-black/70">
          Cross-jurisdiction analysis · {filtered.length} cases
        </p>
      </div>

      {/* Filters */}
      <div className="border-b-2 border-border bg-card">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">Filter:</span>

          <select
            value={filterJurisdiction}
            onChange={(e) => setFilterJurisdiction(e.target.value as Jurisdiction | "")}
            className="border-2 border-border bg-background px-3 py-1.5 text-xs font-mono font-bold uppercase"
          >
            <option value="">All Jurisdictions</option>
            {JURISDICTIONS.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>

          <select
            value={filterViolation}
            onChange={(e) => setFilterViolation(e.target.value as ViolationType | "")}
            className="border-2 border-border bg-background px-3 py-1.5 text-xs font-mono font-bold uppercase"
          >
            <option value="">All Violations</option>
            {VIOLATION_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          <select
            value={filterSector}
            onChange={(e) => setFilterSector(e.target.value as Sector | "")}
            className="border-2 border-border bg-background px-3 py-1.5 text-xs font-mono font-bold uppercase"
          >
            <option value="">All Sectors</option>
            {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex border-2 border-border">
            {(["matrix", "patterns", "side-by-side"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors ${
                  view === v ? "bg-black text-[#FFD700]" : "bg-background text-foreground hover:bg-muted"
                }`}
              >
                {v === "matrix" ? "Matrix" : v === "patterns" ? "Patterns" : "Compare"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-4 py-8">

        {/* ═══ MATRIX VIEW ═══ */}
        {view === "matrix" && (
          <div>
            <h2 className="text-lg font-mono font-bold uppercase tracking-wider mb-4">
              Violation × Jurisdiction Matrix
            </h2>
            <p className="text-xs font-mono text-muted-foreground mb-6">
              Cell shows case count and average fine. Color intensity = case frequency.
            </p>

            <div className="overflow-x-auto border-2 border-border">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-black text-[#FFD700]">
                    <th className="text-left p-3 text-[10px] font-mono font-bold uppercase tracking-wider border-r-2 border-border min-w-[200px]">
                      Violation Type
                    </th>
                    {matrixData.jurisdictions.map((j) => (
                      <th
                        key={j}
                        className="p-3 text-[10px] font-mono font-bold uppercase tracking-wider text-center border-r border-border/30 min-w-[120px]"
                      >
                        {j}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixData.violations.map((v, vi) => (
                    <tr key={v} className={vi % 2 === 0 ? "bg-card" : "bg-background"}>
                      <td className="p-3 text-xs font-mono font-bold border-r-2 border-border">
                        {v}
                      </td>
                      {matrixData.jurisdictions.map((j) => {
                        const cell = matrixData.cells.get(`${v}|${j}`);
                        return (
                          <td
                            key={j}
                            className="p-3 text-center border-r border-border/20"
                            style={{ background: heatColor(cell?.count || 0, maxCellCount) }}
                          >
                            {cell && cell.count > 0 ? (
                              <div>
                                <div className="text-sm font-bold font-mono">{cell.count}</div>
                                <div className="text-[10px] font-mono text-muted-foreground">
                                  avg {formatFine(cell.avgFine)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ PATTERNS VIEW ═══ */}
        {view === "patterns" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-mono font-bold uppercase tracking-wider mb-1">
                Enforcement Patterns
              </h2>
              <p className="text-xs font-mono text-muted-foreground mb-6">
                How the same violation type is treated across jurisdictions.
              </p>
            </div>

            {patterns.map((p) => {
              const isExpanded = expandedPattern === p.violation;
              return (
                <div key={p.violation} className="border-2 border-border bg-card">
                  {/* Header */}
                  <button
                    onClick={() => setExpandedPattern(isExpanded ? null : p.violation)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <h3 className="text-sm font-mono font-bold uppercase tracking-wider">{p.violation}</h3>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        {p.totalCases} cases across {p.jurisdictions.size} jurisdictions
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {p.commonFindings.length > 0 && (
                        <div className="hidden sm:flex gap-1">
                          {p.commonFindings.slice(0, 3).map((f) => (
                            <span key={f} className="text-[9px] font-mono px-2 py-0.5 bg-muted border border-border">
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                      <span className="text-lg font-mono">{isExpanded ? "−" : "+"}</span>
                    </div>
                  </button>

                  {/* Expanded comparison */}
                  {isExpanded && (
                    <div className="border-t-2 border-border p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...p.jurisdictions.entries()]
                          .sort((a, b) => b[1].avgFine - a[1].avgFine)
                          .map(([jurisdiction, data]) => (
                            <div key={jurisdiction} className="border-2 border-border bg-background p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-mono font-bold uppercase tracking-wider">{jurisdiction}</h4>
                                <span
                                  className="text-xs font-mono font-bold px-2 py-0.5"
                                  style={{ background: "#FFD700", color: "#000" }}
                                >
                                  {data.cases.length} {data.cases.length === 1 ? "case" : "cases"}
                                </span>
                              </div>

                              <div className="space-y-2 mb-3">
                                <div className="flex justify-between text-[10px] font-mono">
                                  <span className="text-muted-foreground uppercase">Avg Fine</span>
                                  <span className="font-bold">{formatFine(data.avgFine)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-mono">
                                  <span className="text-muted-foreground uppercase">Max Fine</span>
                                  <span className="font-bold">{formatFine(data.maxFine)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-mono">
                                  <span className="text-muted-foreground uppercase">Outcomes</span>
                                  <span className="font-bold text-right max-w-[60%]">{data.outcomes.join(", ")}</span>
                                </div>
                              </div>

                              <div className="border-t border-border pt-2 space-y-1.5">
                                {data.cases.slice(0, 3).map((c) => (
                                  <Link
                                    key={c.id}
                                    to={`/case/${c.id}`}
                                    className="block text-[10px] font-mono hover:underline"
                                  >
                                    <span className="font-bold">{getDisplayCompany(c)}</span>
                                    <span className="text-muted-foreground ml-1">
                                      ({c.year}) {c.fineAmount > 0 ? formatFine(c.fineAmount) : c.outcomeSummary || "—"}
                                    </span>
                                  </Link>
                                ))}
                                {data.cases.length > 3 && (
                                  <span className="text-[9px] font-mono text-muted-foreground">
                                    +{data.cases.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>

                      {/* Legal rationale summary */}
                      {p.commonFindings.length > 0 && (
                        <div className="mt-4 border-t-2 border-border pt-4">
                          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-2">
                            Common Legal Rationale
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {p.commonFindings.map((f) => (
                              <span
                                key={f}
                                className="text-[10px] font-mono px-2 py-1 border-2 border-border bg-muted"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ SIDE-BY-SIDE VIEW ═══ */}
        {view === "side-by-side" && (
          <div>
            <h2 className="text-lg font-mono font-bold uppercase tracking-wider mb-1">
              Side-by-Side Comparison
            </h2>
            <p className="text-xs font-mono text-muted-foreground mb-6">
              Select up to 4 cases to compare. Click a case below to add or remove it.
            </p>

            {/* Selected cards */}
            {selectedCaseObjects.length > 0 && (
              <div className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {selectedCaseObjects.map((c) => (
                    <div key={c.id} className="border-2 border-black bg-card p-4 relative">
                      <button
                        onClick={() => toggleCase(c.id)}
                        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-xs font-mono font-bold bg-black text-white hover:bg-red-600 transition-colors"
                      >
                        ×
                      </button>
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider pr-6">
                        {getDisplayCompany(c)}
                      </h3>
                      <p className="text-[10px] font-mono text-muted-foreground">{c.jurisdiction} · {c.year}</p>

                      <div className="mt-3 space-y-2">
                        <Row label="Fine" value={c.fineAmount > 0 ? c.fineDisplay : c.outcomeSummary || "—"} />
                        <Row label="Severity" value={`${c.severityForIndividuals}/10`} color={severityColor(c.severityForIndividuals)} />
                        <Row label="Sector" value={c.sector} />
                        <Row label="Violations" value={c.violations.join("; ")} />
                        <Row label="Outcome" value={c.outcomeSummary || "Fine"} />
                      </div>

                      {c.regulatoryFindings && c.regulatoryFindings.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-border">
                          <span className="text-[9px] font-mono font-bold uppercase text-muted-foreground">Legal Basis</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {c.regulatoryFindings.slice(0, 3).map((f, i) => (
                              <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 bg-muted border border-border">
                                {f.act}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <Link
                        to={`/case/${c.id}`}
                        className="block mt-3 text-[10px] font-mono font-bold uppercase text-center py-1.5 border-2 border-border hover:bg-black hover:text-[#FFD700] transition-colors"
                      >
                        View Full Case →
                      </Link>
                    </div>
                  ))}
                </div>

                {/* Comparison summary table */}
                {selectedCaseObjects.length >= 2 && (
                  <div className="border-2 border-border overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-black text-[#FFD700]">
                          <th className="p-3 text-[10px] font-mono font-bold uppercase text-left border-r border-border/30 min-w-[120px]">
                            Attribute
                          </th>
                          {selectedCaseObjects.map((c) => (
                            <th key={c.id} className="p-3 text-[10px] font-mono font-bold uppercase text-center border-r border-border/30">
                              {getDisplayCompany(c)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: "Jurisdiction", fn: (c: EnforcementCase) => c.jurisdiction },
                          { label: "Year", fn: (c: EnforcementCase) => String(c.year) },
                          { label: "Fine", fn: (c: EnforcementCase) => c.fineAmount > 0 ? c.fineDisplay : "—" },
                          { label: "Severity", fn: (c: EnforcementCase) => `${c.severityForIndividuals}/10` },
                          { label: "Sector", fn: (c: EnforcementCase) => c.sector },
                          { label: "Outcome", fn: (c: EnforcementCase) => c.outcomeSummary || "Fine" },
                          { label: "Impacted", fn: (c: EnforcementCase) => c.impactedIndividuals || "—" },
                          { label: "Violation", fn: (c: EnforcementCase) => c.violations.join(", ") },
                        ].map((row, ri) => (
                          <tr key={row.label} className={ri % 2 === 0 ? "bg-card" : "bg-background"}>
                            <td className="p-3 text-[10px] font-mono font-bold uppercase border-r-2 border-border">
                              {row.label}
                            </td>
                            {selectedCaseObjects.map((c) => (
                              <td key={c.id} className="p-3 text-xs font-mono text-center border-r border-border/20">
                                {row.fn(c)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Case picker */}
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider mb-3 text-muted-foreground">
              {selectedCases.length < 4 ? "Select cases to compare" : "Maximum 4 cases selected"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {filtered.map((c) => {
                const isSelected = selectedCases.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCase(c.id)}
                    disabled={!isSelected && selectedCases.length >= 4}
                    className={`text-left p-3 border-2 transition-all ${
                      isSelected
                        ? "border-black bg-black text-[#FFD700]"
                        : selectedCases.length >= 4
                        ? "border-border bg-muted opacity-40 cursor-not-allowed"
                        : "border-border bg-card hover:border-black"
                    }`}
                  >
                    <div className="text-xs font-mono font-bold uppercase tracking-wider">
                      {getDisplayCompany(c)}
                    </div>
                    <div className="text-[10px] font-mono mt-0.5 opacity-70">
                      {c.jurisdiction} · {c.year} · {c.fineAmount > 0 ? formatFine(c.fineAmount) : c.outcomeSummary || "—"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* Tiny row helper for side-by-side cards */
const Row = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="flex justify-between text-[10px] font-mono">
    <span className="text-muted-foreground uppercase">{label}</span>
    <span className="font-bold text-right max-w-[60%]" style={color ? { color } : undefined}>{value}</span>
  </div>
);

export default Compare;
