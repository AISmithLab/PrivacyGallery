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
  { key: "newest", label: "Newest Case" },
  { key: "fined", label: "Cost of Fine" },
  { key: "severity", label: "Severity" },
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
    <aside className="w-56 shrink-0 space-y-5 hidden lg:block">
      {/* Sort By */}
      <div className="brutalist-border bg-card">
        <p className="sidebar-heading">Sort By</p>
        <div>
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => onSortChange(s.key)}
              className={`sidebar-btn ${sortMode === s.key ? "active" : ""}`}
            >
              {sortMode === s.key ? "● " : "○ "}{s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter By label */}
      <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Filter By
      </p>

      {/* Sector */}
      <div className="brutalist-border bg-card">
        <p className="sidebar-heading">Sector</p>
        <div className="max-h-48 overflow-y-auto">
          {SECTORS.map((s) => (
            <button
              key={s}
              onClick={() => onToggleSector(s)}
              className={`sidebar-btn ${selectedSectors.includes(s) ? "active" : ""}`}
            >
              {selectedSectors.includes(s) ? "☑ " : "☐ "}{s}
            </button>
          ))}
        </div>
      </div>

      {/* Violation */}
      <div className="brutalist-border bg-card">
        <p className="sidebar-heading">Violation</p>
        <div>
          {VIOLATION_TYPES.map((v) => (
            <button
              key={v}
              onClick={() => onToggleViolation(v)}
              className={`sidebar-btn ${selectedViolations.includes(v) ? "active" : ""}`}
            >
              {selectedViolations.includes(v) ? "☑ " : "☐ "}{v}
            </button>
          ))}
        </div>
      </div>

      {/* Jurisdiction */}
      <div className="brutalist-border bg-card">
        <p className="sidebar-heading">Jurisdiction</p>
        <div>
          {JURISDICTIONS.map((j) => (
            <button
              key={j}
              onClick={() => onToggleJurisdiction(j)}
              className={`sidebar-btn ${selectedJurisdictions.includes(j) ? "active" : ""}`}
            >
              {selectedJurisdictions.includes(j) ? "☑ " : "☐ "}{j}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default FilterSidebar;
