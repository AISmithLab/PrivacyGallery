import { Jurisdiction, JURISDICTIONS, ViolationType, VIOLATION_TYPES } from "@/data/cases";

interface FilterSidebarProps {
  selectedJurisdictions: Jurisdiction[];
  onToggleJurisdiction: (j: Jurisdiction) => void;
  selectedViolations: ViolationType[];
  onToggleViolation: (v: ViolationType) => void;
  totalCases: number;
  totalFines: string;
}

const FilterSidebar = ({
  selectedJurisdictions,
  onToggleJurisdiction,
  selectedViolations,
  onToggleViolation,
  totalCases,
  totalFines,
}: FilterSidebarProps) => {
  return (
    <aside className="w-72 shrink-0 space-y-6">
      {/* Stats */}
      <div className="space-y-2">
        <p className="font-mono text-xs font-bold uppercase tracking-wider">📊 Stats</p>
        <div className="brutalist-border bg-card p-3 space-y-1">
          <p className="text-sm">
            <span className="font-bold">{totalCases}</span> enforcement cases
          </p>
          <p className="text-sm">
            <span className="font-bold">{totalFines}</span> in fines
          </p>
        </div>
      </div>

      {/* Jurisdiction filters */}
      <div className="space-y-2">
        <p className="font-mono text-xs font-bold uppercase tracking-wider">🏛️ Jurisdiction</p>
        <div className="space-y-1.5">
          {JURISDICTIONS.map((j) => (
            <button
              key={j}
              onClick={() => onToggleJurisdiction(j)}
              className={`filter-btn w-full text-left text-xs ${
                selectedJurisdictions.includes(j) ? "active" : ""
              }`}
            >
              {j}
            </button>
          ))}
        </div>
      </div>

      {/* Violation type filters */}
      <div className="space-y-2">
        <p className="font-mono text-xs font-bold uppercase tracking-wider">⚠️ Violation Type</p>
        <div className="space-y-1.5">
          {VIOLATION_TYPES.map((v) => (
            <button
              key={v}
              onClick={() => onToggleViolation(v)}
              className={`filter-btn w-full text-left text-xs ${
                selectedViolations.includes(v) ? "active" : ""
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default FilterSidebar;
