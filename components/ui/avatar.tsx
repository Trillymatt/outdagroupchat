import { cn } from "@/lib/utils/cn";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const chars = parts.length > 1 ? [parts[0][0], parts[parts.length - 1][0]] : [parts[0]?.[0] ?? "?"];
  return chars.join("").toUpperCase();
}

export function Avatar({
  name,
  color = "#1f5f42",
  size = 32,
  className,
}: {
  name: string;
  color?: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      title={name}
      className={cn("flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-surface shrink-0", className)}
      style={{ width: size, height: size, fontSize: size * 0.38, background: color }}
    >
      {initials(name)}
    </div>
  );
}

export function AvatarStack({
  members,
  size = 32,
  max = 5,
}: {
  members: { name: string; color?: string }[];
  size?: number;
  max?: number;
}) {
  const shown = members.slice(0, max);
  const overflow = members.length - shown.length;
  return (
    <div className="flex items-center" style={{ marginLeft: 6 }}>
      {shown.map((m, i) => (
        <Avatar key={i} name={m.name} color={m.color} size={size} className="-ml-1.5 first:ml-0" />
      ))}
      {overflow > 0 && (
        <div
          className="-ml-1.5 flex items-center justify-center rounded-full bg-ink/10 text-ink-soft font-semibold ring-2 ring-surface"
          style={{ width: size, height: size, fontSize: size * 0.34 }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
