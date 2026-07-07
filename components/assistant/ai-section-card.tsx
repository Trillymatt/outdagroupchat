"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function AiSectionCard({
  title,
  description,
  actionLabel,
  onGenerate,
  loading,
  error,
  children,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onGenerate: () => void;
  loading: boolean;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      layout
      className={cn(
        "space-y-4 rounded-3xl border border-line bg-surface p-5",
        "relative overflow-hidden",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-sync-gradient" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sync-gradient text-white">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="font-semibold text-ink">{title}</h2>
            <p className="text-sm text-ink-soft">{description}</p>
          </div>
        </div>
        <Button size="sm" onClick={onGenerate} disabled={loading}>
          {loading ? "Thinking…" : actionLabel}
        </Button>
      </div>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
      <div className="space-y-3">{children}</div>
    </motion.section>
  );
}
