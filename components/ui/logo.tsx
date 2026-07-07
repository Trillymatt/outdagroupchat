import Link from "next/link";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden>
      <path
        d="M3 20 C 9 8, 13 8, 14 14 S 19 20, 25 8"
        stroke="url(#logo-gradient)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="3" cy="20" r="2.6" fill="var(--color-green)" />
      <circle cx="25" cy="8" r="2.6" fill="var(--color-lime)" />
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="28" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--color-green)" />
          <stop offset="0.55" stopColor="var(--color-teal)" />
          <stop offset="1" stopColor="var(--color-lime)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({ href = "/dashboard", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2 font-semibold tracking-tight text-ink ${className ?? ""}`}>
      <LogoMark />
      <span className="text-lg">Tandem</span>
    </Link>
  );
}
