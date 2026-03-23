import { useState } from "react";
import TopNav from "@/components/TopNav";
import JurisdictionMap from "@/components/JurisdictionMap";
import JurisdictionDetail from "@/components/JurisdictionDetail";
import type { Jurisdiction } from "@/data/cases";

export default function Explore() {
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<Jurisdiction | null>(null);

  return (
    <div className="min-h-screen bg-background loot-drop-page" style={{ backgroundColor: "#F5F3EF" }}>
      <TopNav />

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <header className="text-center mb-4">
          <h1 className="hero-title text-6xl sm:text-8xl font-bold tracking-tighter uppercase leading-none">
            Explore
          </h1>
          <p className="text-sm font-mono text-muted-foreground mt-3 max-w-xl mx-auto">
            Click on a highlighted region to learn about its privacy enforcement framework, key laws, and how it appears in our dataset.
          </p>
        </header>

        <JurisdictionMap
          selectedJurisdiction={selectedJurisdiction}
          onSelectJurisdiction={setSelectedJurisdiction}
        />

        {selectedJurisdiction && (
          <JurisdictionDetail jurisdiction={selectedJurisdiction} />
        )}
      </div>
    </div>
  );
}
