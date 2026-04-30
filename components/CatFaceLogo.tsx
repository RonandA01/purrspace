interface CatFaceLogoProps {
  size?: number;
  className?: string;
}

export function CatFaceLogo({ size = 32, className = "" }: CatFaceLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="PurrSpace cat logo"
    >
      {/* ── Outer ears ── */}
      <polygon points="6,26 14,4 26,22"  fill="currentColor" />
      <polygon points="58,26 50,4 38,22" fill="currentColor" />

      {/* ── Inner ear detail ── */}
      <polygon points="10,23 15,9  23,21"  fill="white" fillOpacity="0.35" />
      <polygon points="54,23 49,9  41,21" fill="white" fillOpacity="0.35" />

      {/* ── Face circle ── */}
      <circle cx="32" cy="36" r="24" fill="currentColor" />

      {/* ── Eyes ── */}
      {/* left eye — slightly happy/squint */}
      <ellipse cx="22" cy="32" rx="4" ry="4.5" fill="white" />
      <ellipse cx="23" cy="32.5" rx="2.2" ry="2.8" fill="#1a1a1a" />
      <circle  cx="24" cy="31"   r="0.9"          fill="white" />

      {/* right eye */}
      <ellipse cx="42" cy="32" rx="4" ry="4.5" fill="white" />
      <ellipse cx="43" cy="32.5" rx="2.2" ry="2.8" fill="#1a1a1a" />
      <circle  cx="44" cy="31"   r="0.9"          fill="white" />

      {/* ── Nose ── */}
      <ellipse cx="32" cy="40" rx="2.8" ry="2" fill="white" fillOpacity="0.85" />

      {/* ── Mouth ── */}
      <path
        d="M29 43 Q32 46.5 35 43"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
        strokeOpacity="0.85"
      />

      {/* ── Whiskers ── */}
      <line x1="8"  y1="39" x2="26" y2="41" stroke="white" strokeWidth="1.1" strokeLinecap="round" strokeOpacity="0.6" />
      <line x1="8"  y1="43" x2="26" y2="43" stroke="white" strokeWidth="1.1" strokeLinecap="round" strokeOpacity="0.6" />
      <line x1="38" y1="41" x2="56" y2="39" stroke="white" strokeWidth="1.1" strokeLinecap="round" strokeOpacity="0.6" />
      <line x1="38" y1="43" x2="56" y2="43" stroke="white" strokeWidth="1.1" strokeLinecap="round" strokeOpacity="0.6" />
    </svg>
  );
}
