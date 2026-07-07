import { cn } from "@/lib/utils/cn";

type BadgeTone = "neutral" | "green" | "success" | "warning" | "danger";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-ink/5 text-ink-soft",
  green: "bg-green/10 text-green-dark",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", toneClasses[tone], className)}>
      {children}
    </span>
  );
}

export function ProgressPill({ label, done, total }: { label: string; done: number; total: number }) {
  const complete = total > 0 && done >= total;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5">
      <div className="relative h-2 w-14 overflow-hidden rounded-full bg-ink/8">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", complete ? "bg-success" : "bg-sync-gradient")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-ink-soft whitespace-nowrap">
        {done}/{total} {label}
      </span>
    </div>
  );
}
