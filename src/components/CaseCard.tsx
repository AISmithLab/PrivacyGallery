import { EnforcementCase, getDisplayCompany, getRedStampDisplay, isSubstantiveWhatTheyDid, isSubstantiveWhyTheyWereWrong, truncateToMaxSentences } from "@/data/cases";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import impactedIcon from "@/assets/impacted-icon.png";

interface CaseCardProps {
  case_: EnforcementCase;
}

const CaseCard = ({ case_ }: CaseCardProps) => {
  const displayCompany = getDisplayCompany(case_);
  const showWhat = isSubstantiveWhatTheyDid(case_);
  const showWhy = isSubstantiveWhyTheyWereWrong(case_);
  const hasDetails = showWhat || showWhy;

  return (
    <Link to={`/case/${case_.id}`} className="block group h-full">
      <div className="file-card file-card-uniform relative mt-4 mr-2 flex h-full min-h-[280px] flex-col">
        {/* Sector bar */}
        <div className="px-4 py-2.5 flex items-center justify-between shrink-0"
          style={{ background: "hsl(var(--card-tab))", color: "hsl(var(--card-tab-foreground))", borderBottom: "4px solid hsl(var(--border))" }}>
          <span className="text-xs font-mono font-bold uppercase tracking-wider">{case_.sector}</span>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
            <Eye className="w-3.5 h-3.5" />
            {case_.views.toLocaleString()}
          </div>
        </div>

        {/* Company, jurisdiction, violations, year, fine */}
        <div className="px-5 pt-5 pb-1 relative shrink-0">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground mb-1">Company</p>
          <h3 className="text-2xl font-bold leading-tight tracking-tight pr-28 company-name-card">
            {displayCompany}
          </h3>
          <p className="text-sm font-mono text-muted-foreground mt-1">({case_.year})</p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="border-2 border-border px-2 py-0.5 text-xs font-mono font-bold">{case_.jurisdiction}</span>
            <div className="flex items-center gap-2">
              <img src={impactedIcon} alt="Impacted" className="w-5 h-5 object-contain" />
              <span className="text-xs font-mono font-bold">{case_.impactedIndividuals || "Unknown"}</span>
            </div>
          </div>

          {/* Red stamp: amount or 2-word consequence (e.g. Consent order) when no fine */}
          <div className="fine-stamp">
            {getRedStampDisplay(case_)}
          </div>
        </div>

        {hasDetails ? (
          <div className="flex flex-1 flex-col min-h-0 px-5">
            <div className="w-full border-t-2 border-dashed my-2 shrink-0" style={{ borderColor: "hsl(var(--border) / 0.5)" }} />
            {showWhat && (
              <div className="pt-2 shrink-0">
                <p className="text-xs font-mono font-bold uppercase tracking-wider mb-1.5" style={{ color: "hsl(var(--label-green))" }}>What they did</p>
                <p className="text-[15px] leading-relaxed">{truncateToMaxSentences(case_.whatTheyDid, 1)}</p>
              </div>
            )}
            {showWhy && (
              <div className="pb-4 pt-2 shrink-0">
                <p className="text-xs font-mono font-bold uppercase tracking-wider mb-1.5" style={{ color: "hsl(var(--label-red))" }}>Why they were wrong</p>
                <p className="text-[15px] leading-relaxed">{truncateToMaxSentences(case_.whyTheyWereWrong, 1)}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 min-h-[60px]" />
        )}
      </div>
    </Link>
  );
};

export default CaseCard;
