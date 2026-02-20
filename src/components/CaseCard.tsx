import { EnforcementCase } from "@/data/cases";
import { Link } from "react-router-dom";
import { Eye, User } from "lucide-react";

interface CaseCardProps {
  case_: EnforcementCase;
}

const CaseCard = ({ case_ }: CaseCardProps) => {
  return (
    <Link to={`/case/${case_.id}`} className="block group">
      <div className="file-card relative mt-4 mr-2 flex flex-col" style={{ minHeight: 420 }}>
        {/* Colored category bar at top */}
        <div className="px-4 py-2.5 flex items-center justify-between"
          style={{ background: "hsl(var(--card-tab))", borderBottom: "2px solid hsl(var(--foreground))" }}>
          <span className="text-sm font-mono font-bold uppercase tracking-wider">{case_.sector}</span>
          <div className="flex items-center gap-1.5 border-2 border-foreground bg-card px-2 py-1 text-xs font-mono font-bold">
            <Eye className="w-3.5 h-3.5" />
            {case_.views.toLocaleString()}
          </div>
        </div>

        {/* Company name + fine stamp */}
        <div className="px-5 pt-5 pb-1 relative">
          <h3 className="text-3xl font-bold leading-tight tracking-tight pr-28">
            {case_.company} <span className="text-xl font-mono text-muted-foreground">({case_.year})</span>
          </h3>
          <p className="text-sm font-mono text-muted-foreground mt-1">{case_.jurisdiction}</p>

          {/* Large overlapping fine badge */}
          <div className="fine-stamp" style={{ top: "-4px", right: "-6px", fontSize: 20, padding: "8px 16px" }}>
            🔥 {case_.fineDisplay}
          </div>
        </div>

        {/* What they did */}
        <div className="px-5 pt-4">
          <p className="text-xs font-mono font-bold uppercase tracking-wider mb-1.5"
            style={{ color: "hsl(var(--label-red))" }}>
            WHAT THEY DID
          </p>
          <p className="text-[15px] leading-relaxed">{case_.violationSummary}</p>
        </div>

        {/* Dashed divider */}
        <div className="mx-5 my-3 border-t-2 border-dashed" style={{ borderColor: "hsl(var(--foreground) / 0.15)" }} />

        {/* Why they were wrong */}
        <div className="px-5">
          <p className="text-xs font-mono font-bold uppercase tracking-wider mb-1.5"
            style={{ color: "hsl(var(--label-green))" }}>
            WHY THEY WERE WRONG
          </p>
          <div className="flex flex-wrap gap-1.5">
            {case_.violations.map((v) => (
              <span key={v} className="border-2 border-foreground px-2.5 py-1 text-xs font-mono font-bold"
                style={{ background: "hsl(var(--card-tab))" }}>
                ⚠️ {v}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom stats - pushed to bottom */}
        <div className="px-5 py-4 mt-auto flex items-center gap-3 border-t" style={{ borderColor: "hsl(var(--foreground) / 0.1)" }}>
          <User className="w-5 h-5 text-muted-foreground shrink-0" />
          <span className="text-sm font-mono font-bold uppercase tracking-wider text-muted-foreground">Impacted:</span>
          <span className="border-2 border-foreground px-3 py-1.5 text-sm font-bold bg-card ml-auto">
            {case_.impactedIndividuals}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default CaseCard;
