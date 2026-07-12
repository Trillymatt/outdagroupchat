"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { AiSectionCard } from "./ai-section-card";
import type { AiSuggestion } from "@/lib/types/trip";

interface CatchMeUpContent {
  summary: string;
  decided: string[];
  open: string[];
}

export function CatchMeUpSection({
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
      const res = await fetch("/api/ai/catch-me-up", {
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

  const content = latest?.content as unknown as CatchMeUpContent | undefined;

  return (
    <AiSectionCard
      title="Catch me up"
      description="A quick recap of what's decided and what's still open — for whoever's behind on the group chat."
      actionLabel={content ? "Refresh summary" : "Catch me up"}
      onGenerate={generate}
      loading={loading}
      error={error}
      hasContent={Boolean(content)}
      contentLabel="latest recap"
    >
      {content && (
        <div className="space-y-3">
          <p className="text-sm text-ink">{content.summary}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-success">Decided</p>
              <ul className="space-y-1 text-sm text-ink-soft">
                {content.decided.map((d, i) => (
                  <li key={i}>• {d}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-warning">Still open</p>
              <ul className="space-y-1 text-sm text-ink-soft">
                {content.open.map((o, i) => (
                  <li key={i}>• {o}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </AiSectionCard>
  );
}
