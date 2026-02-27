import { Search, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Jurisdiction, JURISDICTIONS, ViolationType, VIOLATION_TYPES, Sector, SECTORS } from "@/data/cases";

interface ControlBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  selectedJurisdictions: Jurisdiction[];
  onToggleJurisdiction: (j: Jurisdiction) => void;
  sort: string;
  onSortChange: (s: string) => void;
  selectedViolations: ViolationType[];
  onToggleViolation: (v: ViolationType) => void;
  selectedSectors: Sector[];
  onToggleSector: (s: Sector) => void;
}

const SORT_OPTIONS = [
  { key: "popular", label: "Most Popular" },
  { key: "newest", label: "Newest" },
  { key: "fined", label: "Fine Amount" },
  { key: "severity", label: "Severity" },
];

function Dropdown({
  label,
  children,
  hasActive,
}: {
  label: string;
  children: React.ReactNode;
  hasActive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider border-2 transition-all ${
          hasActive
            ? "border-black bg-black text-[#FFD700]"
            : "border-border/50 bg-card text-foreground hover:border-black"
        }`}
      >
        {label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[200px] bg-card border-2 border-black shadow-[4px_4px_0_black]">
          {children}
        </div>
      )}
    </div>
  );
}

const ControlBar = ({
  search,
  onSearchChange,
  selectedJurisdictions,
  onToggleJurisdiction,
  sort,
  onSortChange,
  selectedViolations,
  onToggleViolation,
  selectedSectors,
  onToggleSector,
}: ControlBarProps) => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = selectedViolations.length + selectedSectors.length;

  return (
    <div className="space-y-0">
      {/* Main control bar */}
      <div className="flex flex-wrap items-center gap-3 bg-card/60 border-2 border-border/30 px-4 py-3">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-card border-2 border-border/50 px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search cases..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 bg-transparent text-sm font-mono placeholder:text-muted-foreground/50 outline-none"
          />
        </div>

        {/* Jurisdiction dropdown */}
        <Dropdown label="Jurisdiction" hasActive={selectedJurisdictions.length > 0}>
          {JURISDICTIONS.map((j) => (
            <button
              key={j}
              type="button"
              onClick={() => onToggleJurisdiction(j)}
              className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors border-b border-border/10 ${
                selectedJurisdictions.includes(j)
                  ? "bg-[#FFD700] text-black font-bold"
                  : "hover:bg-secondary"
              }`}
            >
              {selectedJurisdictions.includes(j) ? "☑ " : "☐ "}
              {j}
            </button>
          ))}
        </Dropdown>

        {/* Sort dropdown */}
        <Dropdown label={`Sort: ${SORT_OPTIONS.find((s) => s.key === sort)?.label}`}>
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => onSortChange(s.key)}
              className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors border-b border-border/10 ${
                sort === s.key
                  ? "bg-[#FFD700] text-black font-bold"
                  : "hover:bg-secondary"
              }`}
            >
              {sort === s.key ? "● " : "○ "}
              {s.label}
            </button>
          ))}
        </Dropdown>

        {/* Advanced filters toggle */}
        <button
          type="button"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider border-2 transition-all ${
            filtersOpen || activeFilterCount > 0
              ? "border-black bg-black text-[#FFD700]"
              : "border-border/50 bg-card text-foreground hover:border-black"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
      </div>

      {/* Collapsible advanced filters */}
      {filtersOpen && (
        <div className="bg-card/80 border-2 border-t-0 border-border/30 px-4 py-4">
          <div className="flex flex-wrap gap-6">
            {/* Violation Type */}
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Violation Type
              </p>
              <div className="flex flex-wrap gap-1.5">
                {VIOLATION_TYPES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onToggleViolation(v)}
                    className={`px-2.5 py-1 text-[11px] font-mono border-2 transition-all ${
                      selectedViolations.includes(v)
                        ? "border-black bg-[#FFD700] text-black font-bold"
                        : "border-border/40 bg-card text-foreground hover:border-black"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Sector */}
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Sector
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SECTORS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onToggleSector(s)}
                    className={`px-2.5 py-1 text-[11px] font-mono border-2 transition-all ${
                      selectedSectors.includes(s)
                        ? "border-black bg-[#FFD700] text-black font-bold"
                        : "border-border/40 bg-card text-foreground hover:border-black"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active filter pills */}
      {(selectedJurisdictions.length > 0 || selectedViolations.length > 0 || selectedSectors.length > 0) && (
        <div className="flex gap-2 flex-wrap px-4 py-2 bg-card/40">
          {[...selectedJurisdictions, ...selectedViolations, ...selectedSectors].map((f) => (
            <span key={f} className="flex items-center gap-1 border-2 border-black bg-[#FFD700] text-black px-2 py-0.5 text-[11px] font-mono font-bold">
              {f}
              <X className="w-3 h-3 cursor-pointer" />
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ControlBar;
