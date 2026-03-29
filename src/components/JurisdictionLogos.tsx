/**
 * SVG logos/emblems for each jurisdiction.
 * Used in the JurisdictionDetail header.
 */

interface LogoProps {
  className?: string;
}

function FTCLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#1a3a6b" stroke="#b8860b" strokeWidth="3" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#b8860b" strokeWidth="1.5" />
      {/* Scales of justice */}
      <line x1="50" y1="22" x2="50" y2="65" stroke="white" strokeWidth="2.5" />
      <line x1="30" y1="35" x2="70" y2="35" stroke="white" strokeWidth="2.5" />
      {/* Left pan */}
      <path d="M30 35 L24 50 L36 50 Z" fill="none" stroke="white" strokeWidth="1.5" />
      {/* Right pan */}
      <path d="M70 35 L64 50 L76 50 Z" fill="none" stroke="white" strokeWidth="1.5" />
      {/* Base */}
      <rect x="42" y="65" width="16" height="4" rx="1" fill="white" />
      <rect x="38" y="69" width="24" height="3" rx="1" fill="white" />
      {/* Text */}
      <text x="50" y="84" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="serif">FTC</text>
    </svg>
  );
}

function CaliforniaLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#1a3a6b" stroke="#b8860b" strokeWidth="3" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#b8860b" strokeWidth="1.5" />
      {/* Star */}
      <polygon points="50,20 54,34 68,34 56,42 61,56 50,47 39,56 44,42 32,34 46,34" fill="#b8860b" />
      {/* Bear silhouette (simplified) */}
      <ellipse cx="50" cy="62" rx="18" ry="8" fill="#8B4513" />
      <circle cx="40" cy="56" r="5" fill="#8B4513" />
      <circle cx="60" cy="56" r="5" fill="#8B4513" />
      <ellipse cx="50" cy="54" rx="12" ry="6" fill="#8B4513" />
      {/* Text */}
      <text x="50" y="86" textAnchor="middle" fill="white" fontSize="6.5" fontWeight="bold" fontFamily="serif">CALIFORNIA</text>
    </svg>
  );
}

function ICOLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#1a237e" stroke="#c62828" strokeWidth="3" />
      {/* Union Jack simplified */}
      <line x1="10" y1="50" x2="90" y2="50" stroke="white" strokeWidth="8" />
      <line x1="50" y1="10" x2="50" y2="90" stroke="white" strokeWidth="8" />
      <line x1="10" y1="50" x2="90" y2="50" stroke="#c62828" strokeWidth="4" />
      <line x1="50" y1="10" x2="50" y2="90" stroke="#c62828" strokeWidth="4" />
      <line x1="15" y1="15" x2="85" y2="85" stroke="white" strokeWidth="4" />
      <line x1="85" y1="15" x2="15" y2="85" stroke="white" strokeWidth="4" />
      {/* Circle overlay with text */}
      <circle cx="50" cy="50" r="22" fill="#1a237e" stroke="white" strokeWidth="2" />
      <text x="50" y="55" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="sans-serif">ICO</text>
    </svg>
  );
}

function PDPCLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Singapore flag inspired */}
      <circle cx="50" cy="50" r="48" fill="white" stroke="#c62828" strokeWidth="3" />
      <clipPath id="pdpc-top">
        <rect x="0" y="0" width="100" height="50" />
      </clipPath>
      <circle cx="50" cy="50" r="48" fill="#c62828" clipPath="url(#pdpc-top)" />
      {/* Crescent */}
      <circle cx="38" cy="35" r="12" fill="white" />
      <circle cx="42" cy="33" r="11" fill="#c62828" />
      {/* Stars */}
      {[
        [55, 25], [62, 30], [58, 38], [48, 38], [52, 30]
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2" fill="white" />
      ))}
      {/* Text */}
      <text x="50" y="72" textAnchor="middle" fill="#1a237e" fontSize="10" fontWeight="bold" fontFamily="sans-serif">PDPC</text>
    </svg>
  );
}

function EULogo({ className, label = "GDPR" }: LogoProps & { label?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#003399" stroke="#FFD700" strokeWidth="3" />
      {/* EU Stars in a circle */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const cx = 50 + 30 * Math.cos(angle);
        const cy = 50 + 30 * Math.sin(angle);
        return (
          <text key={i} x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#FFD700" fontSize="12">
            ★
          </text>
        );
      })}
      {/* Center text */}
      <text x="50" y="53" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="sans-serif">
        {label}
      </text>
    </svg>
  );
}

function AustraliaLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#00008B" stroke="#FFD700" strokeWidth="3" />
      {/* Southern Cross (simplified) */}
      {[
        [60, 28], [72, 40], [68, 58], [55, 65], [50, 45]
      ].map(([cx, cy], i) => (
        <text key={i} x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={i === 4 ? "8" : "10"}>
          ★
        </text>
      ))}
      {/* Commonwealth star */}
      <text x="30" y="55" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="16">★</text>
      {/* Text */}
      <text x="50" y="86" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">OAIC</text>
    </svg>
  );
}

import type { Jurisdiction } from "@/data/cases";

export function JurisdictionLogo({ jurisdiction, className = "w-16 h-16" }: { jurisdiction: Jurisdiction; className?: string }) {
  switch (jurisdiction) {
    case "US FTC":
      return <FTCLogo className={className} />;
    case "California DOJ":
      return <CaliforniaLogo className={className} />;
    case "UK ICO":
      return <ICOLogo className={className} />;
    case "Singapore PDPC":
      return <PDPCLogo className={className} />;
    case "EU GDPR":
      return <EULogo className={className} label="GDPR" />;
    case "Australia OAIC":
      return <AustraliaLogo className={className} />;
    default:
      return null;
  }
}
