export function RouteBackdrop({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 160"
      fill="none"
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      <path
        d="M-20 120 C 140 20, 260 20, 340 90 S 560 160, 660 70 S 780 10, 840 40"
        stroke="url(#route-gradient)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 14"
        className="animate-dash"
      />
      <circle cx="340" cy="90" r="5" fill="var(--color-teal)" />
      <circle cx="660" cy="70" r="5" fill="var(--color-lime)" />
      <defs>
        <linearGradient id="route-gradient" x1="0" y1="0" x2="800" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--color-green)" />
          <stop offset="0.55" stopColor="var(--color-teal)" />
          <stop offset="1" stopColor="var(--color-lime)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function RouteConnector({ height = 40 }: { height?: number }) {
  return (
    <svg width="16" height={height} viewBox={`0 0 16 ${height}`} fill="none" aria-hidden className="shrink-0">
      <circle cx="8" cy="6" r="4" className="fill-green" />
      <line x1="8" y1="12" x2="8" y2={height} stroke="var(--color-line)" strokeWidth="2" strokeDasharray="1 6" strokeLinecap="round" />
    </svg>
  );
}
