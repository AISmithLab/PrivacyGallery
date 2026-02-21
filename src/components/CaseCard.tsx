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
      <div className="file-card relative mt-6 mr-2 flex flex-col">
        {/* Poster header bar */}
        <div className="px-4 py-2 text-center border-b-2 border-foreground"
          style={{ background: "hsl(var(--card-tab))" }}>
          <span className="text-xs font-bold uppercase tracking-[0.2em]"
            style={{ fontFamily: "'Rye', cursive", fontSize: 11 }}>
            {case_.sector}
          </span>
        </div>

        {/* Company name — wanted poster style */}
        <div className="px-5 pt-5 pb-1 relative">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Eye className="w-3.5 h-3.5" />
              {case_.views.toLocaleString()} views
            </div>
          </div>
          <h3 className="text-3xl leading-tight tracking-tight uppercase pr-28"
            style={{ fontFamily: "'Rye', cursive" }}>
            {case_.company}
          </h3>
          <span className="text-sm text-muted-foreground">
            ({case_.year})
          </span>

          <div className="flex items-center gap-6 mt-3">
            <span className="text-sm font-bold text-muted-foreground border-2 border-foreground px-3 py-1.5"
              style={{ fontFamily: "'Rye', cursive", fontSize: 12 }}>
              {case_.jurisdiction}
            </span>
            <div className="flex items-center gap-2 text-sm">
              <img src={impactedIcon} alt="People impacted" className="w-5 h-5 object-contain opacity-70" />
              <span className="font-semibold text-muted-foreground">{case_.impactedIndividuals}</span>
            </div>
          </div>

          {/* Fine amount — red text on tape */}
          <div className="fine-stamp" style={{ top: "-8px", right: "8px", fontSize: 18, padding: "6px 20px" }}>
            {case_.fineDisplay}
          </div>
        </div>

        {/* What they did */}
        <div className="px-5 pt-4">
          <p className="text-xs font-bold uppercase tracking-wider mb-1.5"
            style={{ color: "hsl(var(--label-green))", fontFamily: "'Rye', cursive", fontSize: 10 }}>
            What They Did
          </p>
          <p className="text-[15px] leading-relaxed">{case_.whatTheyDid}</p>
        </div>

        {/* Divider */}
        <div className="mx-5 my-2 border-t-2 border-dashed" style={{ borderColor: "hsl(var(--foreground) / 0.15)" }} />

        {/* Why they were wrong */}
        <div className="px-5 pb-5">
          <p className="text-xs font-bold uppercase tracking-wider mb-1.5"
            style={{ color: "hsl(var(--label-red))", fontFamily: "'Rye', cursive", fontSize: 10 }}>
            Why They Were Wrong
          </p>
          <p className="text-[15px] leading-relaxed">{case_.whyTheyWereWrong}</p>
        </div>
      </div>
    </Link>
  );
};

export default CaseCard;
