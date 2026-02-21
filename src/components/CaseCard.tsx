import { EnforcementCase } from "@/data/cases";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import impactedIcon from "@/assets/impacted-icon.png";

interface CaseCardProps {
  case_: EnforcementCase;
}

const CaseCard = ({ case_ }: CaseCardProps) => {
  return (
    <Link to={`/case/${case_.id}`} className="block group">
      <div className="file-card relative mt-4 mr-2 flex flex-col">
        {/* Colored category bar at top */}
        <div className="px-4 py-2.5 flex items-center justify-between"
          style={{ background: "hsl(var(--card-tab))", borderBottom: "4px solid hsl(var(--foreground))" }}>
          <span className="text-sm font-mono font-bold uppercase tracking-wider">{case_.sector}</span>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
            <Eye className="w-3.5 h-3.5" />
            {case_.views.toLocaleString()}
          </div>
        </div>

        {/* Company name + fine stamp */}
        <div className="px-5 pt-5 pb-1 relative">
          <h3 className="text-3xl font-bold leading-tight tracking-tight pr-28">
            {case_.company} <span className="text-xl font-mono text-muted-foreground">({case_.year})</span>
          </h3>
          <div className="flex items-center gap-6 mt-2">
            <span className="text-sm font-mono font-bold text-muted-foreground border-4 border-foreground px-3 py-1.5">{case_.jurisdiction}</span>
            <div className="flex items-center gap-2">
              <img src={impactedIcon} alt="Impacted" className="w-6 h-6 object-contain" />
              <span className="text-sm font-mono font-bold">{case_.impactedIndividuals}</span>
            </div>
          </div>

          {/* Large overlapping fine badge */}
          <div className="fine-stamp" style={{ top: "-4px", right: "-6px", fontSize: 22, padding: "10px 18px" }}>
            {case_.fineDisplay}
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
