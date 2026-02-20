import { Jurisdiction, JURISDICTIONS, ViolationType, VIOLATION_TYPES, Sector, SECTORS } from "@/data/cases";

interface FilterSidebarProps {
  selectedJurisdictions: Jurisdiction[];
  onToggleJurisdiction: (j: Jurisdiction) => void;
  selectedViolations: ViolationType[];
  onToggleViolation: (v: ViolationType) => void;
  selectedSectors: Sector[];
  onToggleSector: (s: Sector) => void;
  sortMode: string;
  onSortChange: (s: string) => void;
}

const SORT_OPTIONS = [
  { key: "newest", label: "Newest" },
  { key: "fined", label: "Highest Fine" },
  { key: "severity", label: "Most Severe" },
  { key: "views", label: "Most Viewed" },
];

const FilterSidebar = ({
  selectedJurisdictions,
  onToggleJurisdiction,
  selectedViolations,
  onToggleViolation,
  selectedSectors,
  onToggleSector,
  sortMode,
  onSortChange,
}: FilterSidebarProps) => {
  return (
    <aside className="w-64 shrink-0 space-y-6 hidden lg:block">
      {/* Sort By */}
      <div className="space-y-2">
        <p className="font-mono text-xs font-bold uppercase tracking-wider brutalist-border bg-primary text-primary-foreground px-3 py-2">
          Sort By
        </p>
        <div className="space-y-1">
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => onSortChange(s.key)}
              className={`w-full text-left px-3 py-2 text-xs font-mono border-2 border-foreground transition-all ${
                sortMode === s.key
                  ? "bg-secondary text-secondary-foreground font-bold"
                  : "bg-card hover:bg-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sector */}
      <div className="space-y-2">
        <p className="font-mono text-xs font-bold uppercase tracking-wider brutalist-border bg-primary text-primary-foreground px-3 py-2">
          Sector
        </p>
        <div className="space-y-1">
          {SECTORS.map((s) => (
            <button
              key={s}
              onClick={() => onToggleSector(s)}
              className={`w-full text-left px-3 py-2 text-xs font-mono border-2 border-foreground transition-all ${
                selectedSectors.includes(s)
                  ? "bg-secondary text-secondary-foreground font-bold"
                  : "bg-card hover:bg-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Violation */}
      <div className="space-y-2">
        <p className="font-mono text-xs font-bold uppercase tracking-wider brutalist-border bg-primary text-primary-foreground px-3 py-2">
          Violation
        </p>
        <div className="space-y-1">
          {VIOLATION_TYPES.map((v) => (
            <button
              key={v}
              onClick={() => onToggleViolation(v)}
              className={`w-full text-left px-3 py-1.5 text-[11px] font-mono border-2 border-foreground transition-all ${
                selectedViolations.includes(v)
                  ? "bg-secondary text-secondary-foreground font-bold"
                  : "bg-card hover:bg-muted"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Jurisdiction */}
      <div className="space-y-2">
        <p className="font-mono text-xs font-bold uppercase tracking-wider brutalist-border bg-primary text-primary-foreground px-3 py-2">
          Jurisdiction
        </p>
        <div className="space-y-1">
          {JURISDICTIONS.map((j) => (
            <button
              key={j}
              onClick={() => onToggleJurisdiction(j)}
              className={`w-full text-left px-3 py-2 text-xs font-mono border-2 border-foreground transition-all ${
                selectedJurisdictions.includes(j)
                  ? "bg-secondary text-secondary-foreground font-bold"
                  : "bg-card hover:bg-muted"
              }`}
            >
              {j}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default FilterSidebar;
