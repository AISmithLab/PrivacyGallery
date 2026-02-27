import TopNav from "@/components/TopNav";

const About = () => {
  return (
    <div className="min-h-screen bg-background loot-drop-page" style={{ backgroundColor: "#F5F3EF" }}>
      <TopNav />

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <header className="text-center">
          <h1 className="hero-title text-5xl sm:text-6xl font-bold tracking-tighter uppercase">
            About
          </h1>
        </header>

        <div className="brutalist-border info-box p-8 space-y-4">
          <p className="text-[15px] leading-relaxed">
            <strong>The Privacy Jury</strong> is a global registry of data privacy enforcement decisions.
            We track enforcement actions across multiple jurisdictions—from the US FTC and California DOJ
            to the UK ICO, EU GDPR authorities, Singapore PDPC, and Australia OAIC.
          </p>
          <p className="text-[15px] leading-relaxed">
            Our goal is to make privacy enforcement data accessible, searchable, and understandable.
            Each case includes details on what the company did, why regulators found them in violation,
            the legal findings, and the outcome.
          </p>
          <p className="text-[15px] leading-relaxed">
            Cases are sourced from official enforcement documents, regulatory press releases, and
            published decision records. All attached PDFs link to original source materials.
          </p>
        </div>

        <div className="detail-yellow-box p-6">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Disclaimer
          </p>
          <p className="text-sm leading-relaxed">
            This registry is provided for informational and research purposes only. It does not constitute
            legal advice. Case summaries are simplified for readability and may not capture every nuance
            of the original enforcement decisions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
