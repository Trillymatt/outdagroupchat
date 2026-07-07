"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-green" : "bg-ink/15",
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className="h-3.5 w-3.5 rounded-full bg-white shadow-sm"
        style={{ marginLeft: checked ? "calc(100% - 0.875rem - 3px)" : "3px" }}
      />
    </button>
  );
}
