import { EnforcementCase } from "@/data/cases";
import SeverityBar from "./SeverityBar";

interface CaseCardProps {
  case_: EnforcementCase;
}

const CaseCard = ({ case_ }: CaseCardProps) => {
  return (
    <div className="brutalist-card flex flex-col">
      {/* Category bar */}
      <div className="card-category-bar flex items-center justify-between">
        <span>{case_.jurisdiction}</span>
        <span className="bg-card text-card-foreground px-2 py-0.5 text-xs brutalist-border">
          📋 {case_.year}
        </span>
      </div>

      {/* Main content */}
      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* Company name + fine */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold leading-tight">{case_.company}</h3>
            <p className="text-xs text-muted-foreground mt-1">{case_.companyDescription}</p>
          </div>
          <span className="fine-badge shrink-0 text-sm">
            🔥 {case_.fineDisplay}
          </span>
        </div>

        {/* Violation summary */}
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent mb-1">
            The Violation
          </p>
          <p className="text-sm leading-relaxed">{case_.violationSummary}</p>
        </div>

        {/* Dashed separator */}
        <div className="border-t-2 border-dashed border-muted-foreground/30" />

        {/* Violation tags */}
        <div className="flex flex-wrap gap-1.5">
          {case_.violations.map((v) => (
            <span key={v} className="violation-tag">
              #{v.toLowerCase().replace(/\s+/g, "_")}
            </span>
          ))}
        </div>

        {/* Severity bars */}
        <div className="space-y-2 mt-auto">
          <SeverityBar label="Severity for individuals" value={case_.severityForIndividuals} />
          <SeverityBar label="Impacted population" value={case_.impactedPopulation} />
        </div>
      </div>

      {/* Footer bar */}
      <div className="card-footer-bar">
        🏛️ {case_.jurisdiction}
      </div>
    </div>
  );
};

export default CaseCard;
