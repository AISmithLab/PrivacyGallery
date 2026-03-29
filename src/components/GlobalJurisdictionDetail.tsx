import { AlertCircle } from "lucide-react";

interface GlobalJurisdiction {
  code: string;
  name: string;
  numericCode: string;
  overview: string;
  authority: string;
  mainLaws: string[];
  enforcementStyle: string;
}

interface GlobalJurisdictionDetailProps {
  country: GlobalJurisdiction;
}

export default function GlobalJurisdictionDetail({ country }: GlobalJurisdictionDetailProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="brutalist-border bg-card p-6">
        <h2 className="text-3xl font-bold tracking-tight uppercase mb-2">
          {country.name}
        </h2>
        <p className="text-sm font-mono text-muted-foreground">
          Data protection overview
        </p>
      </div>

      {/* No Cases Banner */}
      <div className="brutalist-border bg-yellow-50 p-6 flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-yellow-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm uppercase tracking-wide mb-1">
            No cases from this jurisdiction in Privacy Jury yet
          </p>
          <p className="text-sm text-muted-foreground">
            Stay tuned! We're expanding our coverage to include enforcement actions from more jurisdictions worldwide.
          </p>
        </div>
      </div>

      {/* Overview */}
      {country.overview && (
        <section>
          <h3 className="text-lg font-bold tracking-tight mb-2 uppercase">\ Overview</h3>
          <div className="h-[3px] bg-border mb-3" />
          <div className="brutalist-border bg-card p-5">
            <p className="text-sm leading-relaxed">{country.overview}</p>
          </div>
        </section>
      )}

      {/* Authority */}
      {country.authority && (
        <section>
          <h3 className="text-lg font-bold tracking-tight mb-2 uppercase">\ Enforcement Authority</h3>
          <div className="h-[3px] bg-border mb-3" />
          <div className="brutalist-border bg-card p-5">
            <p className="text-sm leading-relaxed">{country.authority}</p>
          </div>
        </section>
      )}

      {/* Main Laws */}
      {country.mainLaws && country.mainLaws.length > 0 && (
        <section>
          <h3 className="text-lg font-bold tracking-tight mb-2 uppercase">\ Main Privacy Laws</h3>
          <div className="h-[3px] bg-border mb-3" />
          <div className="space-y-2">
            {country.mainLaws.map((law, i) => (
              <div key={i} className="brutalist-border bg-card p-4" style={{ borderLeftWidth: "4px", borderLeftColor: "#FFD700" }}>
                <p className="text-sm font-bold">{law}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Enforcement Style */}
      {country.enforcementStyle && (
        <section>
          <h3 className="text-lg font-bold tracking-tight mb-2 uppercase">\ Enforcement Style</h3>
          <div className="h-[3px] bg-border mb-3" />
          <div className="brutalist-border bg-card p-5">
            <p className="text-sm leading-relaxed">{country.enforcementStyle}</p>
          </div>
        </section>
      )}

      {/* Source */}
      <p className="text-xs text-muted-foreground font-mono text-center">
        Source:{" "}
        <a
          href={`https://www.dlapiperdataprotection.com/?c=${country.code}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          DLA Piper Data Protection Laws of the World
        </a>
      </p>
    </div>
  );
}

export type { GlobalJurisdiction };
