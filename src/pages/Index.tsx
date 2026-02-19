import { useState, useMemo } from "react";
import { cases, Jurisdiction, ViolationType } from "@/data/cases";
import CaseCard from "@/components/CaseCard";
import SearchBar from "@/components/SearchBar";
import FilterSidebar from "@/components/FilterSidebar";

type SortMode = "newest" | "fined" | "severity";

const SORT_OPTIONS: { key: SortMode; label: string; icon: string }[] = [
  { key: "newest", label: "NEWEST", icon: "✨" },
  { key: "fined", label: "FINED", icon: "🔥" },
  { key: "severity", label: "SEVERITY", icon: "💀" },
];

const formatTotalFines = (total: number): string => {
  if (total >= 1_000_000_000) return `$${(total / 1_000_000_000).toFixed(1)}B+`;
  if (total >= 1_000_000) return `$${(total / 1_000_000).toFixed(1)}M+`;
  return `$${total.toLocaleString()}`;
};

const Index = () => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<Jurisdiction[]>([]);
  const [selectedViolations, setSelectedViolations] = useState<ViolationType[]>([]);

  const toggleJurisdiction = (j: Jurisdiction) => {
    setSelectedJurisdictions((prev) =>
      prev.includes(j) ? prev.filter((x) => x !== j) : [...prev, j]
    );
  };

  const toggleViolation = (v: ViolationType) => {
    setSelectedViolations((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  };

  const filtered = useMemo(() => {
    let result = [...cases];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.company.toLowerCase().includes(q) ||
          c.violationSummary.toLowerCase().includes(q) ||
          c.companyDescription.toLowerCase().includes(q)
      );
    }

    if (selectedJurisdictions.length > 0) {
      result = result.filter((c) => selectedJurisdictions.includes(c.jurisdiction));
    }

    if (selectedViolations.length > 0) {
      result = result.filter((c) =>
        c.violations.some((v) => selectedViolations.includes(v))
      );
    }

    switch (sort) {
      case "newest":
        result.sort((a, b) => b.year - a.year);
        break;
      case "fined":
        result.sort((a, b) => b.fineAmount - a.fineAmount);
        break;
      case "severity":
        result.sort((a, b) => b.severityForIndividuals - a.severityForIndividuals);
        break;
    }

    return result;
  }, [search, sort, selectedJurisdictions, selectedViolations]);

  const totalFines = cases.reduce((sum, c) => sum + c.fineAmount, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero header */}
      <header className="py-12 px-6 text-center">
        <div className="inline-block brutalist-border bg-primary text-primary-foreground px-4 py-1 text-xs font-mono font-bold uppercase tracking-wider mb-6">
          ⚖️ OVER 1,219 ENFORCEMENT CASES
        </div>
        <h1 className="text-5xl md:text-7xl font-bold leading-none tracking-tight mb-4">
          THE PRIVACY
          <br />
          GRAVEYARD
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto">
          Where{" "}
          <span className="brutalist-border px-2 py-0.5 font-bold bg-card">1,219</span>{" "}
          enforcement cases and{" "}
          <span className="brutalist-border px-2 py-0.5 font-bold bg-card">
            {formatTotalFines(totalFines)}
          </span>{" "}
          in fines were levied across 6 jurisdictions.
        </p>
        <p className="text-accent font-bold mt-2">Explore the wreckage.</p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="brutalist-border bg-accent text-accent-foreground px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
            LIVE DATA
          </span>
          <span className="text-xs font-mono uppercase">
            6 JURISDICTIONS TRACKED
          </span>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex gap-6 px-6 pb-12 max-w-[1400px] mx-auto">
        {/* Left sidebar */}
        <FilterSidebar
          selectedJurisdictions={selectedJurisdictions}
          onToggleJurisdiction={toggleJurisdiction}
          selectedViolations={selectedViolations}
          onToggleViolation={toggleViolation}
          totalCases={cases.length}
          totalFines={formatTotalFines(totalFines)}
        />

        {/* Right content */}
        <div className="flex-1 space-y-4">
          <SearchBar value={search} onChange={setSearch} />

          {/* Sort buttons */}
          <div className="flex gap-2 flex-wrap">
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`filter-btn text-xs ${sort === s.key ? "active" : ""}`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          {/* Results count */}
          <p className="text-xs font-mono text-muted-foreground">
            Showing {filtered.length} of {cases.length} cases
          </p>

          {/* Card grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((c) => (
              <CaseCard key={c.id} case_={c} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="brutalist-border bg-card p-12 text-center">
              <p className="text-lg font-bold">No cases found.</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
