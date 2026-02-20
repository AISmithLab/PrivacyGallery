import { EnforcementCase } from "@/data/cases";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";

interface CaseCardProps {
  case_: EnforcementCase;
}

const CaseCard = ({ case_ }: CaseCardProps) => {
  return (
    <Link to={`/case/${case_.id}`} className="block group">
      <div className="file-card relative mt-4 mr-2">
        {/* File tab */}
        <div className="file-tab">{case_.jurisdiction}</div>

        {/* Overlapping fine stamp */}
        <div className="fine-stamp">{case_.fineDisplay}</div>

        <div className="pt-5 p-5">
          {/* Views */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono mb-2">
            <Eye className="w-3 h-3" />
            <span>{case_.views.toLocaleString()}</span>
          </div>

          {/* Company + meta */}
          <h3 className="text-2xl font-bold leading-tight tracking-tight">{case_.company}</h3>
          <div className="flex items-center gap-2 mt-1 text-xs font-mono text-muted-foreground">
            <span>{case_.jurisdiction}</span>
            <span>•</span>
            <span>{case_.complaintYear} – {case_.year}</span>
          </div>

          {/* Divider */}
          <div className="my-3 border-t border-foreground/10" />

          {/* Who they are */}
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider mb-1"
            style={{ color: "hsl(var(--label-green))" }}>
            WHO THEY ARE
          </p>
          <p className="text-sm leading-relaxed">{case_.companyDescription}</p>

          {/* Divider */}
          <div className="my-3 border-t border-foreground/10" />

          {/* What they did */}
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider mb-1"
            style={{ color: "hsl(var(--label-red))" }}>
            WHAT THEY DID
          </p>
          <p className="text-sm leading-relaxed">{case_.violationSummary}</p>

          {/* Bottom stats */}
          <div className="mt-4 pt-3 border-t border-foreground/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono">Impacted Individuals:</span>
              <span className="border-2 border-foreground px-3 py-0.5 text-xs font-bold bg-card">
                {case_.impactedIndividuals}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono">Severity:</span>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-4 border border-foreground ${
                      i < case_.severityForIndividuals ? "severity-bar-fill" : "severity-bar-empty"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CaseCard;
