"use client";

export function PawPrintIcon({
  className = "",
  size = 20,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      {/* Main pad */}
      <ellipse cx="12" cy="16" rx="4.5" ry="3.5" />
      {/* Four toe beans */}
      <ellipse cx="6.5" cy="11" rx="1.8" ry="2.2" />
      <ellipse cx="10"  cy="9"  rx="1.8" ry="2.2" />
      <ellipse cx="14"  cy="9"  rx="1.8" ry="2.2" />
      <ellipse cx="17.5" cy="11" rx="1.8" ry="2.2" />
    </svg>
  );
}
