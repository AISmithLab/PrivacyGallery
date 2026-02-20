import { useState, useMemo } from "react";
import { cases, Jurisdiction, ViolationType, Sector } from "@/data/cases";
import CaseCard from "@/components/CaseCard";
import SearchBar from "@/components/SearchBar";
import FilterSidebar from "@/components/FilterSidebar";

const formatTotalFines = (total: number): string => {
  if (total >= 1_000_000_000) return `$${(total / 1_000_000_000).toFixed(1)}B+`;
  if (total >= 1_000_000) return `$${(total / 1_000_000).toFixed(1)}M+`;
  return `$${total.toLocaleString()}`;
};

const Index = () => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<Jurisdiction[]>([]);
  const [selectedViolations, setSelectedViolations] = useState<ViolationType[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<Sector[]>([]);

  const toggle = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>) => (item: T) => {
    setter((prev) => prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]);
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

    if (selectedJurisdictions.length > 0)
      result = result.filter((c) => selectedJurisdictions.includes(c.jurisdiction));
    if (selectedViolations.length > 0)
      result = result.filter((c) => c.violations.some((v) => selectedViolations.includes(v)));
    if (selectedSectors.length > 0)
      result = result.filter((c) => selectedSectors.includes(c.sector));

    switch (sort) {
      case "newest": result.sort((a, b) => b.year - a.year); break;
      case "fined": result.sort((a, b) => b.fineAmount - a.fineAmount); break;
      case "severity": result.sort((a, b) => b.severityForIndividuals - a.severityForIndividuals); break;
    }

    return result;
  }, [search, sort, selectedJurisdictions, selectedViolations, selectedSectors]);

  const totalFines = cases.reduce((sum, c) => sum + c.fineAmount, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="py-10 px-6 text-center">
        <h1 className="text-5xl md:text-7xl font-bold leading-none tracking-tighter uppercase">
          The Privacy
          <br />
          Jury
        </h1>
        <p className="text-base md:text-lg max-w-xl mx-auto mt-3 text-muted-foreground">
          A global registry of{" "}
          <span className="font-bold text-foreground">{cases.length}</span>{" "}
          data privacy enforcement decisions..
        </p>
      </header>

      {/* Divider */}
      <div className="mx-6 max-w-[1400px] lg:mx-auto border-t-2 border-foreground" />

      {/* Main layout */}
      <div className="flex gap-8 px-6 py-8 max-w-[1400px] mx-auto">
        <FilterSidebar
          selectedJurisdictions={selectedJurisdictions}
          onToggleJurisdiction={toggle(setSelectedJurisdictions)}
          selectedViolations={selectedViolations}
          onToggleViolation={toggle(setSelectedViolations)}
          selectedSectors={selectedSectors}
          onToggleSector={toggle(setSelectedSectors)}
          sortMode={sort}
          onSortChange={setSort}
        />

        <div className="flex-1 space-y-4">
          <SearchBar value={search} onChange={setSearch} />

          {/* Active filter pills */}
          {(selectedJurisdictions.length > 0 || selectedViolations.length > 0 || selectedSectors.length > 0) && (
            <div className="flex gap-2 flex-wrap">
              {[...selectedJurisdictions, ...selectedSectors, ...selectedViolations].map((f) => (
                <span key={f} className="border-2 border-foreground bg-secondary text-secondary-foreground px-3 py-1 text-xs font-mono font-bold">
                  {f} ×
                </span>
              ))}
            </div>
          )}

          <p className="text-xs font-mono text-muted-foreground">
            Showing {filtered.length} of {cases.length} cases • {formatTotalFines(totalFines)} in total fines
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
