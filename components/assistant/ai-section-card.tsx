"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function AiSectionCard({
  title,
  description,
  actionLabel,
  onGenerate,
  loading,
  error,
  hasContent,
  contentLabel,
  secondaryAction,
  formSlot,
  children,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onGenerate: () => void;
  loading: boolean;
  error?: string | null;
  hasContent: boolean;
  contentLabel: string;
  secondaryAction?: { label: string; onClick: () => void; active?: boolean };
  formSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(true);
  const contentId = useId();

  function generate() {
    setExpanded(true);
    onGenerate();
  }

  return (
    <motion.section
      layout
      className={cn(
        "rounded-2xl border border-line bg-surface px-3 py-3 sm:px-4",
        "transition-shadow hover:shadow-[0_10px_30px_-24px_rgba(20,18,31,0.45)]",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green/10 text-green sm:mt-0">
            <Sparkles size={13} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h2 className="text-sm font-semibold text-ink">{title}</h2>
              {hasContent && <span className="text-xs text-ink-soft">{contentLabel}</span>}
            </div>
            <p className="text-xs leading-relaxed text-ink-soft">{description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-1">
          {hasContent && (
            <Button
              size="sm"
              variant="ghost"
              className="px-2.5 text-xs"
              onClick={() => setExpanded((current) => !current)}
              aria-expanded={expanded}
              aria-controls={contentId}
            >
              {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
              {expanded ? "Hide" : "Show"}
            </Button>
          )}
          {secondaryAction && (
            <Button
              size="sm"
              variant={secondaryAction.active ? "primary" : "ghost"}
              className="px-2.5 text-xs"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
          <Button size="sm" variant="secondary" className="px-2.5 text-xs" onClick={generate} disabled={loading}>
            {loading ? "Thinking…" : actionLabel}
          </Button>
        </div>
      </div>
      {formSlot && <div className="mt-3 border-t border-line/70 pt-3">{formSlot}</div>}
      <AnimatePresence initial={false}>
        {(error || (hasContent && expanded)) && (
          <motion.div
            id={contentId}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-2.5 border-t border-line/70 pt-3 mt-3">
              {error && <p className="text-sm font-medium text-danger">{error}</p>}
              {hasContent && expanded && children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
