import { EnforcementCase } from "@/data/cases";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";

interface CaseCardProps {
  case_: EnforcementCase;
}

const CaseCard = ({ case_ }: CaseCardProps) => {
  return (
    <Link to={`/case/${case_.id}`} className="block group">
      <div className="brutalist-card flex flex-col hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform cursor-pointer"
        style={{ boxShadow: "5px 5px 0px hsl(var(--foreground))" }}>
        {/* Top row: views + company + fine */}
        <div className="p-5 pb-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-2">
            <Eye className="w-3.5 h-3.5" />
            <span>{case_.views.toLocaleString()}</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-2xl font-bold leading-tight tracking-tight">{case_.company}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono font-bold text-muted-foreground">{case_.jurisdiction}</span>
                <span className="text-xs font-mono text-muted-foreground">{case_.complaintYear} – {case_.year}</span>
              </div>
            </div>
            <span className="fine-badge-rotated shrink-0 text-sm font-bold brutalist-border px-3 py-1"
              style={{ transform: "rotate(6deg)", background: "hsl(var(--fine-badge))", color: "hsl(var(--fine-badge-foreground))" }}>
              {case_.fineDisplay}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 my-3 border-t-2 border-dashed border-muted-foreground/30" />

        {/* Who they are */}
        <div className="px-5">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 mb-1">
            WHO THEY ARE
          </p>
          <p className="text-sm leading-relaxed">{case_.companyDescription}</p>
        </div>

        {/* Divider */}
        <div className="mx-5 my-3 border-t border-muted-foreground/20" />

        {/* What they did */}
        <div className="px-5">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent mb-1">
            WHAT THEY DID
          </p>
          <p className="text-sm leading-relaxed">{case_.violationSummary}</p>
        </div>

        {/* Bottom stats */}
        <div className="px-5 py-4 mt-auto space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono">Impacted Individuals:</span>
            <span className="brutalist-border px-3 py-0.5 text-xs font-bold bg-card">
              {case_.impactedIndividuals}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono">Severity:</span>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-8 h-4 border-2 border-foreground ${
                    i < case_.severityForIndividuals ? "severity-bar-fill" : "severity-bar-empty"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CaseCard;
