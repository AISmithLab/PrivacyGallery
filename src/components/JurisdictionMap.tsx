import { useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import type { Jurisdiction } from "@/data/cases";
import { JURISDICTION_INFO, getJurisdictionByCountryCode } from "@/data/jurisdictionInfo";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface JurisdictionMapProps {
  selectedJurisdiction: Jurisdiction | null;
  onSelectJurisdiction: (jurisdiction: Jurisdiction | null) => void;
}

/** Build a lookup: ISO numeric code → color */
function buildCountryColorMap(): Record<string, { color: string; jurisdictions: Jurisdiction[] }> {
  const map: Record<string, { color: string; jurisdictions: Jurisdiction[] }> = {};
  for (const info of Object.values(JURISDICTION_INFO)) {
    for (const code of info.countryCodes) {
      if (!map[code]) {
        map[code] = { color: info.color, jurisdictions: [] };
      }
      map[code].jurisdictions.push(info.jurisdiction);
    }
  }
  return map;
}

const countryColorMap = buildCountryColorMap();

export default function JurisdictionMap({
  selectedJurisdiction,
  onSelectJurisdiction,
}: JurisdictionMapProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  const selectedCodes = useMemo(() => {
    if (!selectedJurisdiction) return new Set<string>();
    const info = JURISDICTION_INFO[selectedJurisdiction];
    return new Set(info.countryCodes);
  }, [selectedJurisdiction]);

  return (
    <div className="border-2 border-black bg-card brutalist-shadow">
      {/* Map */}
      <div className="relative">
        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={{
            scale: 135,
            center: [15, 20],
          }}
          width={900}
          height={330}
          style={{ width: "100%", height: "auto" }}
        >
          <ZoomableGroup>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const countryCode = geo.id;
                  const entry = countryColorMap[countryCode];
                  const isHighlighted = !!entry;
                  const isSelected = selectedCodes.has(countryCode);
                  const isHovered = hoveredCountry === countryCode && isHighlighted;

                  let fill = "#E5E5E5";
                  let strokeWidth = 0.5;
                  let stroke = "#D4D4D4";

                  if (isHighlighted) {
                    fill = entry.color;
                    if (isSelected) {
                      strokeWidth = 2;
                      stroke = "#000000";
                    }
                    if (isHovered) {
                      fill = `${entry.color}CC`;
                      strokeWidth = 1.5;
                      stroke = "#000000";
                    }
                  }

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none", cursor: isHighlighted ? "pointer" : "default" },
                        pressed: { outline: "none" },
                      }}
                      onMouseEnter={() => {
                        if (isHighlighted) setHoveredCountry(countryCode);
                      }}
                      onMouseLeave={() => setHoveredCountry(null)}
                      onClick={() => {
                        if (!isHighlighted) return;
                        const jurisdictions = getJurisdictionByCountryCode(countryCode);
                        if (jurisdictions.length === 1) {
                          const j = jurisdictions[0];
                          onSelectJurisdiction(selectedJurisdiction === j ? null : j);
                        } else if (jurisdictions.length > 1) {
                          const next = jurisdictions.find((j) => j !== selectedJurisdiction) || jurisdictions[0];
                          onSelectJurisdiction(next);
                        }
                      }}
                    />
                  );
                })
              }
            </Geographies>
            {/* Singapore is too small for 110m resolution — render as a circle marker */}
            <Marker coordinates={[103.8198, 1.3521]}>
              <circle
                r={4}
                fill={
                  selectedJurisdiction === "Singapore PDPC"
                    ? JURISDICTION_INFO["Singapore PDPC"].color
                    : hoveredCountry === "SGP"
                    ? `${JURISDICTION_INFO["Singapore PDPC"].color}CC`
                    : JURISDICTION_INFO["Singapore PDPC"].color
                }
                stroke={
                  selectedJurisdiction === "Singapore PDPC" || hoveredCountry === "SGP"
                    ? "#000000"
                    : "#059669"
                }
                strokeWidth={selectedJurisdiction === "Singapore PDPC" ? 2 : 1}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredCountry("SGP")}
                onMouseLeave={() => setHoveredCountry(null)}
                onClick={() =>
                  onSelectJurisdiction(
                    selectedJurisdiction === "Singapore PDPC" ? null : "Singapore PDPC"
                  )
                }
              />
            </Marker>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Legend */}
      <div className="px-5 py-4 border-t-2 border-black bg-background">
        <p className="text-xs font-mono font-bold uppercase tracking-wider mb-3">Jurisdictions</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {Object.values(JURISDICTION_INFO).map((info) => (
            <button
              key={info.jurisdiction}
              onClick={() =>
                onSelectJurisdiction(
                  selectedJurisdiction === info.jurisdiction ? null : info.jurisdiction
                )
              }
              className={`flex items-center gap-2 text-xs font-mono transition-all hover:opacity-80 ${
                selectedJurisdiction === info.jurisdiction
                  ? "font-bold underline underline-offset-2"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <span
                className="inline-block w-3 h-3 border border-black shrink-0"
                style={{ backgroundColor: info.color }}
              />
              <span>{info.flag} {info.abbreviation}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
