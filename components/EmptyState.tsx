"use client";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
      {/* Sleeping cat SVG line-art */}
      <svg
        width="160"
        height="120"
        viewBox="0 0 160 120"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-muted-foreground/40"
        aria-hidden
      >
        {/* Body */}
        <ellipse cx="80" cy="80" rx="48" ry="28" />
        {/* Head */}
        <circle cx="120" cy="60" r="20" />
        {/* Left ear */}
        <polygon points="108,44 113,30 122,44" />
        {/* Right ear */}
        <polygon points="120,44 129,30 135,44" />
        {/* Tail curled */}
        <path d="M32,78 Q10,90 18,105 Q26,118 40,108" />
        {/* Closed eyes (sleeping ~) */}
        <path d="M112,58 Q115,55 118,58" />
        <path d="M122,58 Q125,55 128,58" />
        {/* Tiny nose */}
        <circle cx="120" cy="63" r="1.5" fill="currentColor" />
        {/* Whiskers left */}
        <line x1="100" y1="62" x2="112" y2="63" />
        <line x1="100" y1="66" x2="112" y2="65" />
        {/* Whiskers right */}
        <line x1="128" y1="63" x2="140" y2="62" />
        <line x1="128" y1="65" x2="140" y2="66" />
        {/* Paws tucked */}
        <ellipse cx="68" cy="100" rx="12" ry="6" />
        <ellipse cx="90" cy="102" rx="10" ry="5" />
        {/* Zzz */}
        <text
          x="138"
          y="40"
          fontSize="14"
          fontFamily="serif"
          strokeWidth="1"
          className="fill-current"
        >
          z
        </text>
        <text
          x="148"
          y="28"
          fontSize="11"
          fontFamily="serif"
          strokeWidth="1"
          className="fill-current"
        >
          z
        </text>
        <text
          x="155"
          y="18"
          fontSize="8"
          fontFamily="serif"
          strokeWidth="1"
          className="fill-current"
        >
          z
        </text>
      </svg>

      <div className="space-y-1">
        <p className="text-base font-medium text-foreground/70">Nothing to see here… yet.</p>
        <p className="text-sm text-muted-foreground">Be the first to share something purrfect.</p>
      </div>
    </div>
  );
}
