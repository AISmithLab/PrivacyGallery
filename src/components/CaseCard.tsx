import { EnforcementCase, getDisplayCompany } from "@/data/cases";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import impactedIcon from "@/assets/impacted-icon.png";

interface CaseCardProps {
  case_: EnforcementCase;
}

const CaseCard = ({ case_ }: CaseCardProps) => {
  const displayCompany = getDisplayCompany(case_);
  const hasDetails = case_.whatTheyDid || case_.whyTheyWereWrong;

  return (
    <Link to={`/case/${case_.id}`} className="block group">
      <div className="file-card relative mt-4 mr-2 flex flex-col">
        {/* Sector bar */}
        <div className="px-4 py-2.5 flex items-center justify-between"
          style={{ background: "hsl(var(--card-tab))", color: "hsl(var(--card-tab-foreground))", borderBottom: "4px solid hsl(var(--border))" }}>
          <span className="text-xs font-mono font-bold uppercase tracking-wider">Sector: {case_.sector}</span>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
            <Eye className="w-3.5 h-3.5" />
            {case_.views.toLocaleString()}
          </div>
        </div>

        {/* Company, jurisdiction, violations, year, fine */}
        <div className="px-5 pt-5 pb-1 relative">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground mb-1">Company</p>
          <h3 className="text-2xl font-bold leading-tight tracking-tight pr-28">
            {displayCompany}
          </h3>
          <p className="text-sm font-mono text-muted-foreground mt-1">({case_.year})</p>

          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-mono font-bold">
              <span className="text-muted-foreground">Jurisdiction:</span>{" "}
              <span className="border-2 border-border px-2 py-0.5">{case_.jurisdiction}</span>
            </p>
            {case_.violations.length > 0 && (
              <p className="text-xs font-mono">
                <span className="font-bold text-muted-foreground">Violations:</span>{" "}
                {case_.violations.join("; ")}
              </p>
            )}
            {case_.impactedIndividuals && (
              <div className="flex items-center gap-2">
                <img src={impactedIcon} alt="Impacted" className="w-5 h-5 object-contain" />
                <span className="text-xs font-mono font-bold">{case_.impactedIndividuals}</span>
              </div>
            )}
          </div>

          {/* Fine badge */}
          <div className="fine-stamp" style={{ top: "-4px", right: "-6px", fontSize: 22, padding: "10px 18px" }}>
            {case_.fineDisplay || "—"}
          </div>
        </div>

        {hasDetails && (
          <>
            <div className="mx-5 my-2 border-t-2 border-dashed" style={{ borderColor: "hsl(var(--border) / 0.5)" }} />
            {case_.whatTheyDid && (
              <div className="px-5 pt-2">
                <p className="text-xs font-mono font-bold uppercase tracking-wider mb-1.5" style={{ color: "hsl(var(--label-green))" }}>What they did</p>
                <p className="text-[15px] leading-relaxed">{case_.whatTheyDid}</p>
              </div>
            )}
            {case_.whyTheyWereWrong && (
              <div className="px-5 pb-4 pt-2">
                <p className="text-xs font-mono font-bold uppercase tracking-wider mb-1.5" style={{ color: "hsl(var(--label-red))" }}>Why they were wrong</p>
                <p className="text-[15px] leading-relaxed">{case_.whyTheyWereWrong}</p>
              </div>
            )}
          </>
        )}
        {!hasDetails && <div className="pb-4" />}
      </div>
    </Link>
  );
};

export default CaseCard;
