import { useState, useMemo } from "react";
import { cases, Jurisdiction, ViolationType, Sector, parseCompanyWorth } from "@/data/cases";
import CaseCard from "@/components/CaseCard";
import ControlBar from "@/components/ControlBar";
import TopNav from "@/components/TopNav";

const formatTotalFines = (total: number): string => {
  if (total >= 1_000_000_000) return `$${(total / 1_000_000_000).toFixed(1)}B+`;
  if (total >= 1_000_000) return `$${(total / 1_000_000).toFixed(1)}M+`;
  return `$${total.toLocaleString()}`;
};

const Index = () => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("popular");
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

    const cardTextLen = (c: typeof result[0]) =>
      (c.whatTheyDid || "").length + (c.whyTheyWereWrong || "").length;
    const worth = (c: typeof result[0]) => parseCompanyWorth(c.companyWorth);

    switch (sort) {
      case "popular":
        result.sort((a, b) => b.views - a.views || worth(b) - worth(a) || cardTextLen(b) - cardTextLen(a));
        break;
      case "newest":
        result.sort((a, b) => b.year - a.year || worth(b) - worth(a) || cardTextLen(b) - cardTextLen(a));
        break;
      case "fined":
        result.sort((a, b) => b.fineAmount - a.fineAmount || worth(b) - worth(a) || cardTextLen(b) - cardTextLen(a));
        break;
      case "severity":
        result.sort((a, b) => b.severityForIndividuals - a.severityForIndividuals || worth(b) - worth(a) || cardTextLen(b) - cardTextLen(a));
        break;
    }

    const jurOrder: Record<string, number> = {
      "US FTC": 0, "California DOJ": 1, "UK ICO": 2, "EU GDPR": 3, "EU EDPB": 4,
      "Singapore PDPC": 5, "Australia OAIC": 6,
    };
    result.sort((a, b) => (jurOrder[a.jurisdiction] ?? 99) - (jurOrder[b.jurisdiction] ?? 99));

    return result;
  }, [search, sort, selectedJurisdictions, selectedViolations, selectedSectors]);

  const totalFines = cases.reduce((sum, c) => sum + c.fineAmount, 0);

  return (
    <div className="min-h-screen bg-background loot-drop-page" style={{ backgroundColor: "#F5F3EF" }}>
      <TopNav />

      {/* Hero */}
      <header
        className="py-12 px-6 text-center border-b-4 border-border loot-drop-hero"
        style={{ background: "#FFD700", color: "#000", borderBottom: "4px solid #000" }}
      >
        <h1 className="hero-title text-7xl sm:text-9xl font-bold tracking-tighter uppercase leading-none">
          Privacy Jury
        </h1>
        <p className="text-base md:text-lg max-w-2xl mx-auto opacity-90 mt-4" style={{ color: "#000" }}>
          A global registry of{" "}
          <span className="font-bold">{cases.length}</span>{" "}
          data privacy enforcement decisions across{" "}
          <span className="font-bold">6</span>{" "}
          jurisdictions, totaling{" "}
          <span className="font-bold">{formatTotalFines(totalFines)}</span>{" "}
          in fines.
        </p>
      </header>

      {/* Main layout — no sidebar */}
      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-4">
        <ControlBar
          search={search}
          onSearchChange={setSearch}
          selectedJurisdictions={selectedJurisdictions}
          onToggleJurisdiction={toggle(setSelectedJurisdictions)}
          sort={sort}
          onSortChange={setSort}
          selectedViolations={selectedViolations}
          onToggleViolation={toggle(setSelectedViolations)}
          selectedSectors={selectedSectors}
          onToggleSector={toggle(setSelectedSectors)}
        />

        <p className="text-xs font-mono text-muted-foreground">
          Showing {filtered.length} of {cases.length} cases • {formatTotalFines(totalFines)} in total fines
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((c) => (
            <CaseCard key={c.id} case_={c} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="brutalist-border bg-card loot-drop-shadow p-12 text-center">
            <p className="text-lg font-bold">No cases found.</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
