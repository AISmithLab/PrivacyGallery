import { EnforcementCase, getDisplayCompany, getRedStampDisplay } from "@/data/cases";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import impactedIcon from "@/assets/impacted-icon.png";

interface CaseCardProps {
  case_: EnforcementCase;
}

const CaseCard = ({ case_ }: CaseCardProps) => {
  const displayCompany = getDisplayCompany(case_);
  const whatTheyDid = (case_.whatTheyDid || "").trim();
  const whyTheyWereWrong = (case_.whyTheyWereWrong || "").trim();

  return (
    <Link to={`/case/${case_.id}`} className="block group">
      <div className="file-card file-card-uniform relative mt-4 mr-2 flex flex-col">
        {/* Red stamp anchored to card top-right — above sector bar, never overlaps company name */}
        <div className="fine-stamp">
          {getRedStampDisplay(case_)}
        </div>

        {/* Sector bar */}
        <div className="px-4 py-2.5 flex items-center justify-between shrink-0"
          style={{ background: "hsl(var(--card-tab))", color: "hsl(var(--card-tab-foreground))", borderBottom: "4px solid hsl(var(--border))" }}>
          <span className="text-xs font-mono font-bold uppercase tracking-wider">{case_.sector}</span>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
            <Eye className="w-3.5 h-3.5" />
            {case_.views.toLocaleString()}
          </div>
        </div>

        {/* Company, jurisdiction, year */}
        <div className="px-5 pt-4 pb-3 shrink-0">
          <h3 className="text-3xl font-bold leading-tight tracking-tight [hyphens:none] company-name-card line-clamp-2 overflow-hidden pr-16">
            {displayCompany}
          </h3>
          <p className="text-base font-mono text-muted-foreground mt-1">
            ({case_.foundingYear && case_.foundingYear > 0 ? case_.foundingYear : case_.year})
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="border-2 border-border px-2 py-0.5 text-sm font-mono font-bold">{case_.jurisdiction}</span>
            <div className="flex items-center gap-2">
              <img src={impactedIcon} alt="Impacted" className="w-5 h-5 object-contain" />
              <span className="text-sm font-mono font-bold">{case_.impactedIndividuals || "Unknown"}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col px-5 pb-4">
          <div className="w-full border-t-2 border-dashed mb-3 shrink-0" style={{ borderColor: "hsl(var(--border) / 0.5)" }} />
          {whatTheyDid && (
            <div className="mb-2">
              <p className="text-xs font-mono font-bold uppercase tracking-wider mb-1.5" style={{ color: "hsl(var(--label-green))" }}>What they did</p>
              <p className="text-[15px] leading-relaxed">{whatTheyDid}</p>
            </div>
          )}
          {whyTheyWereWrong && (
            <div>
              <p className="text-xs font-mono font-bold uppercase tracking-wider mb-1.5" style={{ color: "hsl(var(--label-red))" }}>Why they were wrong</p>
              <p className="text-[15px] leading-relaxed">{whyTheyWereWrong}</p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default CaseCard;
