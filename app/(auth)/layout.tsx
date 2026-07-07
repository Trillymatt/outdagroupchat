import { LogoMark } from "@/components/ui/logo";
import { RouteBackdrop } from "@/components/ui/route-line";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-paper px-4 py-16">
      <ThemeToggle className="absolute right-4 top-4 z-10" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-40">
        <RouteBackdrop className="h-full w-full" />
      </div>
      <div className="relative flex items-center gap-2 text-lg font-semibold tracking-tight text-ink">
        <LogoMark size={32} />
        Tandem
      </div>
      <p className="relative mt-1 text-sm text-ink-soft">Plan trips together, in sync.</p>
      <div className="relative z-10 mt-8 w-full max-w-sm">{children}</div>
    </div>
  );
}
