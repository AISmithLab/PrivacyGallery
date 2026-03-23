import { useState, useMemo, useCallback } from "react";
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

const median = (nums: number[]): number => {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

type ViewMode = "matrix" | "side-by-side";
const CASES_PER_PAGE = 12;

/* ────────── Dimension & Metric config ────────── */

type DimensionKey = "jurisdiction" | "violation" | "sector" | "outcome" | "country" | "severity";

const ROW_DIMENSIONS: { key: DimensionKey; label: string }[] = [
  { key: "jurisdiction", label: "Jurisdiction" },
  { key: "violation", label: "Violation Type" },
  { key: "sector", label: "Sector" },
  { key: "outcome", label: "Enforcement Outcome" },
];

const COL_DIMENSIONS: { key: DimensionKey; label: string }[] = [
  { key: "jurisdiction", label: "Jurisdiction" },
  { key: "violation", label: "Violation Type" },
  { key: "sector", label: "Sector" },
  { key: "outcome", label: "Enforcement Outcome" },
];

const getDimensionValues = (key: DimensionKey, data: EnforcementCase[]): string[] => {
  const set = new Set<string>();
  data.forEach((c) => {
    switch (key) {
      case "jurisdiction": set.add(c.jurisdiction); break;
      case "violation": c.violations.forEach((v) => set.add(v)); break;
      case "sector": set.add(c.sector); break;
      case "outcome": set.add(c.outcomeSummary || "Other"); break;
      case "country": set.add(c.country); break;
      case "severity":
        if (c.severityForIndividuals >= 8) set.add("High (8-10)");
        else if (c.severityForIndividuals >= 5) set.add("Medium (5-7)");
        else set.add("Low (1-4)");
        break;
    }
  });
  return [...set].sort();
};

const getCaseValue = (c: EnforcementCase, key: DimensionKey): string[] => {
  switch (key) {
    case "jurisdiction": return [c.jurisdiction];
    case "violation": return c.violations;
    case "sector": return [c.sector];
    case "outcome": return [c.outcomeSummary || "Other"];
    case "country": return [c.country];
    case "severity":
      if (c.severityForIndividuals >= 8) return ["High (8-10)"];
      if (c.severityForIndividuals >= 5) return ["Medium (5-7)"];
      return ["Low (1-4)"];
  }
};

type MetricKey = "count" | "avg_fine" | "median_fine" | "max_fine" | "pct_fined" | "pct_reprimand" | "avg_severity";

const METRICS: { key: MetricKey; label: string }[] = [
  { key: "count", label: "Case Count" },
  { key: "avg_fine", label: "Average Fine" },
];

const computeMetric = (cs: EnforcementCase[], metric: MetricKey): number => {
  if (!cs.length) return 0;
  switch (metric) {
    case "count": return cs.length;
    case "avg_fine": return cs.reduce((s, c) => s + c.fineAmount, 0) / cs.length;
    case "median_fine": return median(cs.map((c) => c.fineAmount));
    case "max_fine": return Math.max(...cs.map((c) => c.fineAmount));
    case "pct_fined": return (cs.filter((c) => c.fineAmount > 0).length / cs.length) * 100;
    case "pct_reprimand": return (cs.filter((c) => c.fineAmount === 0).length / cs.length) * 100;
    case "avg_severity": return cs.reduce((s, c) => s + c.severityForIndividuals, 0) / cs.length;
  }
};

const formatMetric = (val: number, metric: MetricKey): string => {
  if (val === 0 && metric !== "count") return "—";
  switch (metric) {
    case "count": return String(val);
    case "avg_fine": case "median_fine": case "max_fine": return formatFine(val);
    case "pct_fined": case "pct_reprimand": return `${val.toFixed(0)}%`;
    case "avg_severity": return val.toFixed(1);
  }
};

/* ────────── component ────────── */

const Compare = () => {
  const [view, setView] = useState<ViewMode>("matrix");
  // Compare case pool filters (default to all, but sorted FTC first)
  const [compareFilterJurisdiction, setCompareFilterJurisdiction] = useState<Jurisdiction | "">("");
  const [compareFilterViolation, setCompareFilterViolation] = useState<ViolationType | "">("");
  const [compareFilterSector, setCompareFilterSector] = useState<Sector | "">("");
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [casesShown, setCasesShown] = useState(CASES_PER_PAGE);

  // Matrix config
  const [rowDimension, setRowDimension] = useState<DimensionKey>("violation");
  const [colDimension, setColDimension] = useState<DimensionKey>("jurisdiction");
  const [metric, setMetric] = useState<MetricKey>("count");

  // Matrix uses all cases
  const filtered = useMemo(() => cases, []);

  // Compare case pool uses its own filters, FTC cases sorted first
  const compareFiltered = useMemo(() => {
    const result = cases.filter((c) => {
      if (compareFilterJurisdiction && c.jurisdiction !== compareFilterJurisdiction) return false;
      if (compareFilterViolation && !c.violations.includes(compareFilterViolation)) return false;
      if (compareFilterSector && c.sector !== compareFilterSector) return false;
      return true;
    });
    // Sort US FTC cases first when no jurisdiction filter is applied
    if (!compareFilterJurisdiction) {
      result.sort((a, b) => {
        const aFtc = a.jurisdiction === "US FTC" ? 0 : 1;
        const bFtc = b.jurisdiction === "US FTC" ? 0 : 1;
        return aFtc - bFtc;
      });
    }
    return result;
  }, [compareFilterJurisdiction, compareFilterViolation, compareFilterSector]);

  /* ── Dynamic matrix ── */
  const matrixData = useMemo(() => {
    const rowValues = getDimensionValues(rowDimension, filtered);
    const colValues = getDimensionValues(colDimension, filtered);

    const cells = new Map<string, { cases: EnforcementCase[]; value: number }>();
    let maxVal = 0;

    rowValues.forEach((rv) => {
      colValues.forEach((cv) => {
        const matching = filtered.filter((c) => {
          const rVals = getCaseValue(c, rowDimension);
          const cVals = getCaseValue(c, colDimension);
          return rVals.includes(rv) && cVals.includes(cv);
        });
        const val = computeMetric(matching, metric);
        if (val > maxVal) maxVal = val;
        cells.set(`${rv}|${cv}`, { cases: matching, value: val });
      });
    });

    return { rowValues, colValues, cells, maxVal };
  }, [filtered, rowDimension, colDimension, metric]);

  const heatColor = useCallback((val: number, maxVal: number) => {
    if (val === 0) return "transparent";
    const intensity = Math.min(val / Math.max(maxVal, 1), 1);
    if (intensity > 0.7) return "rgba(220, 38, 38, 0.22)";
    if (intensity > 0.3) return "rgba(245, 158, 11, 0.15)";
    return "rgba(34, 197, 94, 0.1)";
  }, []);

  const toggleCase = (id: string) => {
    setSelectedCases((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const selectedCaseObjects = cases.filter((c) => selectedCases.includes(c.id));

  const severityColor = (sev: number) => {
    if (sev >= 8) return "#dc2626";
    if (sev >= 5) return "#f59e0b";
    return "#22c55e";
  };

  const rowLabel = ROW_DIMENSIONS.find((d) => d.key === rowDimension)?.label || "";
  const colLabel = COL_DIMENSIONS.find((d) => d.key === colDimension)?.label || "";
  const metricLabel = METRICS.find((m) => m.key === metric)?.label || "";

  return (
    <div className="min-h-screen bg-background" style={{ backgroundColor: "#F5F3EF" }}>
      <TopNav />

      <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <header className="text-center mb-4">
          <h1 className="hero-title text-6xl sm:text-8xl font-bold tracking-tighter uppercase leading-none">
            {view === "matrix" ? "Compare Features" : "Compare Cases"}
          </h1>
          <p className="text-sm font-mono text-muted-foreground mt-3">
            Explore relationships across jurisdictions, violations, sectors, and outcomes
          </p>
        </header>

        {/* View toggle */}
        <div className="flex justify-center">
          <div className="flex border-2 border-border">
            {(["matrix", "side-by-side"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-colors ${
                  view === v ? "bg-black text-[#FFD700]" : "bg-background text-foreground hover:bg-muted"
                }`}
              >
                {v === "matrix" ? "Features" : "Cases"}
              </button>
            ))}
          </div>
          <p className="text-xs font-mono text-muted-foreground mt-2">
            {view === "matrix"
              ? "Click Cases to compare individual cases side-by-side"
              : "Click Features to explore patterns across jurisdictions and violations"}
          </p>
        </div>

        {/* ═══ MATRIX VIEW ═══ */}
        {view === "matrix" && (
          <div>
            {/* Axis & Metric Control Panel */}
            <div className="border-2 border-border bg-card p-6 mb-8 brutalist-shadow">
              <h2 className="text-xl font-mono font-bold uppercase tracking-wider mb-1">
                Configure Comparison
              </h2>
              <p className="text-xs font-mono text-muted-foreground mb-6">
                Choose what to compare. Select rows, columns, and the metric to display in each cell.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Rows */}
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                    Rows
                  </label>
                  <select
                    value={rowDimension}
                    onChange={(e) => {
                      const key = e.target.value as DimensionKey;
                      if (key === colDimension) setColDimension(rowDimension);
                      setRowDimension(key);
                    }}
                    className="w-full border-2 border-border bg-background px-3 py-2 text-xs font-mono font-bold uppercase"
                  >
                    {ROW_DIMENSIONS.map((d) => (
                      <option key={d.key} value={d.key}>{d.label}</option>
                    ))}
                  </select>
                </div>

                {/* Columns */}
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                    Columns
                  </label>
                  <select
                    value={colDimension}
                    onChange={(e) => {
                      const key = e.target.value as DimensionKey;
                      if (key === rowDimension) setRowDimension(colDimension);
                      setColDimension(key);
                    }}
                    className="w-full border-2 border-border bg-background px-3 py-2 text-xs font-mono font-bold uppercase"
                  >
                    {COL_DIMENSIONS.map((d) => (
                      <option key={d.key} value={d.key}>{d.label}</option>
                    ))}
                  </select>
                </div>

                {/* Metric */}
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                    Cell Metric
                  </label>
                  <div className="inline-flex border-2 border-black">
                    {METRICS.map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setMetric(m.key)}
                        className={`px-4 py-2 text-xs font-mono font-bold transition-all ${
                          metric === m.key
                            ? "bg-black text-[#FFD700]"
                            : "bg-background hover:bg-muted"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-border flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                  Current view:
                </span>
                <span className="text-sm font-mono font-bold uppercase" style={{ color: "#000" }}>
                  {rowLabel} × {colLabel}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground mx-1">showing</span>
                <span className="text-sm font-mono font-bold uppercase" style={{ color: "#000" }}>
                  {metricLabel}
                </span>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto border-2 border-border brutalist-shadow">
              <table className="w-full border-collapse" style={{ minWidth: `${Math.max(matrixData.colValues.length * 180, 800)}px` }}>
                <thead>
                  <tr className="bg-black text-[#FFD700]">
                    <th className="text-left p-5 text-sm font-mono font-bold uppercase tracking-wider border-r-2 border-border/50" style={{ minWidth: 260 }}>
                      {rowLabel}
                    </th>
                    {matrixData.colValues.map((cv) => (
                      <th
                        key={cv}
                        className="p-5 text-sm font-mono font-bold uppercase tracking-wider text-center border-r border-border/30"
                        style={{ minWidth: 170 }}
                      >
                        {cv}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixData.rowValues.map((rv, ri) => (
                    <tr key={rv} className={ri % 2 === 0 ? "bg-card" : "bg-background"}>
                      <td className="p-5 text-sm font-mono font-bold border-r-2 border-border/50 whitespace-nowrap">
                        {rv}
                      </td>
                      {matrixData.colValues.map((cv) => {
                        const cell = matrixData.cells.get(`${rv}|${cv}`);
                        const val = cell?.value || 0;
                        return (
                          <td
                            key={cv}
                            className="p-5 text-center border-r border-border/20"
                            style={{ background: heatColor(val, matrixData.maxVal) }}
                          >
                            {cell && cell.cases.length > 0 ? (
                              <div>
                                <div className="text-2xl font-bold font-mono">{formatMetric(val, metric)}</div>
                                {metric !== "count" && (
                                  <div className="text-xs font-mono text-muted-foreground mt-1">
                                    {cell.cases.length} case{cell.cases.length !== 1 ? "s" : ""}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/30 text-2xl">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-4 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              <span>Intensity →</span>
              <span className="inline-block w-5 h-3" style={{ background: "rgba(34, 197, 94, 0.1)" }} /> Low
              <span className="inline-block w-5 h-3" style={{ background: "rgba(245, 158, 11, 0.15)" }} /> Med
              <span className="inline-block w-5 h-3" style={{ background: "rgba(220, 38, 38, 0.22)" }} /> High
            </div>
          </div>
        )}

        {/* ═══ SIDE-BY-SIDE VIEW ═══ */}
        {view === "side-by-side" && (
          <div>
            <h2 className="text-lg font-mono font-bold uppercase tracking-wider mb-1">
              Side-by-Side Comparison
            </h2>
            <p className="text-xs font-mono text-muted-foreground mb-4">
              Select up to 3 cases to compare.
            </p>

            {selectedCaseObjects.length > 0 && (
              <div className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                  {selectedCaseObjects.map((c) => (
                    <div key={c.id} className="border-2 border-black bg-card p-5 relative brutalist-shadow">
                      <button
                        onClick={() => toggleCase(c.id)}
                        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-sm font-mono font-bold bg-black text-white hover:bg-red-600 transition-colors"
                      >
                        ×
                      </button>
                      <h3 className="text-lg font-mono font-bold uppercase tracking-wider pr-8">
                        {getDisplayCompany(c)}
                      </h3>
                      <p className="text-xs font-mono text-muted-foreground mt-1">{c.jurisdiction} · {c.year}</p>
                      <div className="mt-4 border-t-2 border-dashed border-border" />
                      {c.whatTheyDid && (
                        <div className="mt-3">
                          <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "#B8860B" }}>What They Did</span>
                          <p className="text-sm font-mono mt-1.5 leading-relaxed">{c.whatTheyDid}</p>
                        </div>
                      )}
                      {c.whyTheyWereWrong && (
                        <div className="mt-4">
                          <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "#dc2626" }}>Why They Were Wrong</span>
                          <p className="text-sm font-mono mt-1.5 leading-relaxed">{c.whyTheyWereWrong}</p>
                        </div>
                      )}
                      <Link
                        to={`/case/${c.id}`}
                        className="block mt-4 text-xs font-mono font-bold uppercase text-center py-2 border-2 border-border hover:bg-[#FFD700] hover:border-[#D4A800] transition-colors"
                      >
                        View Full Case →
                      </Link>
                    </div>
                  ))}
                </div>

                {selectedCaseObjects.length >= 2 && (
                  <div className="border-2 border-border overflow-x-auto brutalist-shadow">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-black text-[#FFD700]">
                          <th className="p-4 text-sm font-mono font-bold uppercase text-left border-r border-border/30 min-w-[140px]">
                            Attribute
                          </th>
                          {selectedCaseObjects.map((c) => (
                            <th key={c.id} className="p-3 text-xs font-mono font-bold uppercase text-center border-r border-border/30">
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
                            <td className="p-4 text-sm font-mono font-bold uppercase border-r-2 border-border">
                              {row.label}
                            </td>
                            {selectedCaseObjects.map((c) => (
                              <td key={c.id} className="p-4 text-sm font-mono text-center border-r border-border/20">
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

            <h3 className="text-sm font-mono font-bold uppercase tracking-wider mb-3">
              {selectedCases.length < 3 ? "Select Cases to Compare" : "Maximum 3 cases selected"}
            </h3>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <select
                value={compareFilterJurisdiction}
                onChange={(e) => { setCompareFilterJurisdiction(e.target.value as Jurisdiction | ""); setCasesShown(CASES_PER_PAGE); }}
                className="w-full border-2 border-border bg-background px-3 py-2 text-xs font-mono font-bold uppercase"
              >
                <option value="">All Jurisdictions</option>
                {JURISDICTIONS.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
              <select
                value={compareFilterViolation}
                onChange={(e) => { setCompareFilterViolation(e.target.value as ViolationType | ""); setCasesShown(CASES_PER_PAGE); }}
                className="w-full border-2 border-border bg-background px-3 py-2 text-xs font-mono font-bold uppercase"
              >
                <option value="">All Violations</option>
                {VIOLATION_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <select
                value={compareFilterSector}
                onChange={(e) => { setCompareFilterSector(e.target.value as Sector | ""); setCasesShown(CASES_PER_PAGE); }}
                className="w-full border-2 border-border bg-background px-3 py-2 text-xs font-mono font-bold uppercase"
              >
                <option value="">All Sectors</option>
                {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {compareFiltered.slice(0, casesShown).map((c) => {
                const isSelected = selectedCases.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCase(c.id)}
                    disabled={!isSelected && selectedCases.length >= 3}
                    className={`text-left p-4 border-2 transition-all shadow-sm ${
                      isSelected
                        ? "border-[#D4A800] bg-[#FFD700]/20"
                        : selectedCases.length >= 3
                        ? "border-border bg-muted opacity-40 cursor-not-allowed"
                        : "border-border bg-card hover:border-black"
                    }`}
                  >
                    <div className="text-base font-mono font-bold uppercase tracking-wider">
                      {getDisplayCompany(c)}
                    </div>
                    <div className="text-xs font-mono mt-1 opacity-70">
                      {c.jurisdiction} · {c.year} · {c.fineAmount > 0 ? formatFine(c.fineAmount) : c.outcomeSummary || "—"}
                    </div>
                  </button>
                );
              })}
            </div>

            {casesShown < compareFiltered.length && (
              <button
                onClick={() => setCasesShown((prev) => prev + CASES_PER_PAGE)}
                className="mt-4 w-full py-3 text-xs font-mono font-bold uppercase tracking-wider border-2 border-[#D4A800] bg-[#FFD700] hover:bg-[#E6C200] transition-colors"
              >
                Show More ({compareFiltered.length - casesShown} remaining)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* Tiny row helper for side-by-side cards */
const Row = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="flex justify-between text-xs font-mono">
    <span className="text-muted-foreground uppercase">{label}</span>
    <span className="font-bold text-right max-w-[60%]" style={color ? { color } : undefined}>{value}</span>
  </div>
);

export default Compare;
