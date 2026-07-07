"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { AiSectionCard } from "./ai-section-card";
import { Badge } from "@/components/ui/badge";
import type { AiSuggestion } from "@/lib/types/trip";

interface BudgetCheckContent {
  summary: string;
  flags: { severity: "info" | "warning"; message: string }[];
}

export function BudgetCheckSection({
  tripId,
  latest,
  setSuggestions,
}: {
  tripId: string;
  latest?: AiSuggestion;
  setSuggestions: Dispatch<SetStateAction<AiSuggestion[]>>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/budget-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      if (data.suggestion) setSuggestions((prev) => [...prev, data.suggestion]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const content = latest?.content as unknown as BudgetCheckContent | undefined;

  return (
    <AiSectionCard
      title="Budget sanity check"
      description="A friendly second look at flight, lodging, and itinerary costs — flags to double check, not verdicts."
      actionLabel={content ? "Check again" : "Check the budget"}
      onGenerate={generate}
      loading={loading}
      error={error}
    >
      {!content && <p className="text-sm text-ink-soft">No check run yet.</p>}
      {content && (
        <div className="space-y-2">
          <p className="text-sm text-ink">{content.summary}</p>
          {content.flags.length === 0 ? (
            <p className="text-sm text-ink-soft">Nothing stood out — looks reasonable.</p>
          ) : (
            <ul className="space-y-2">
              {content.flags.map((flag, i) => (
                <li key={i} className="flex items-start gap-2 rounded-2xl border border-line bg-paper p-3 text-sm">
                  <Badge tone={flag.severity === "warning" ? "warning" : "neutral"} className="mt-0.5 shrink-0">
                    {flag.severity}
                  </Badge>
                  <span className="text-ink-soft">{flag.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </AiSectionCard>
  );
}
