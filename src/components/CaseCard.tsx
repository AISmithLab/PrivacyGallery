import { EnforcementCase } from "@/data/cases";
import { Link } from "react-router-dom";
import { Eye, Users } from "lucide-react";

interface CaseCardProps {
  case_: EnforcementCase;
}

const CaseCard = ({ case_ }: CaseCardProps) => {
  return (
    <Link to={`/case/${case_.id}`} className="block group">
      <div className="file-card relative mt-4 mr-2 flex flex-col">
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
          <div className="flex items-center gap-2 mt-2">
            <Users className="w-6 h-6" />
            <span className="text-base font-mono font-bold">{case_.impactedIndividuals}</span>
          </div>

          {/* Large overlapping fine badge */}
          <div className="fine-stamp" style={{ top: "-4px", right: "-6px", fontSize: 20, padding: "8px 16px" }}>
            🔥 {case_.fineDisplay}
          </div>
        </div>

        {/* What they did */}
        <div className="px-5 pt-5">
          <p className="text-xs font-mono font-bold uppercase tracking-wider mb-1.5"
            style={{ color: "hsl(var(--label-green))" }}>
            WHAT THEY DID
          </p>
          <p className="text-[15px] leading-relaxed">{case_.whatTheyDid}</p>
        </div>

        {/* Dashed divider */}
        <div className="mx-5 my-2 border-t-2 border-dashed" style={{ borderColor: "hsl(var(--foreground) / 0.15)" }} />

        {/* Why they were wrong */}
        <div className="px-5 pb-4">
          <p className="text-xs font-mono font-bold uppercase tracking-wider mb-1.5"
            style={{ color: "hsl(var(--label-red))" }}>
            WHY THEY WERE WRONG
          </p>
          <p className="text-[15px] leading-relaxed">{case_.whyTheyWereWrong}</p>
        </div>
      </div>
    </Link>
  );
};

export default CaseCard;
