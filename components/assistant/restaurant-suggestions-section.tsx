"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { MapPin } from "lucide-react";
import { AiSectionCard } from "./ai-section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AiSuggestion } from "@/lib/types/trip";

interface RestaurantSuggestionContent {
  name: string;
  cuisine: string;
  notes: string;
  nearLabel?: string | null;
}

export function RestaurantSuggestionsSection({
  tripId,
  currentUserId,
  suggestions,
  setSuggestions,
  onDismiss,
}: {
  tripId: string;
  currentUserId: string;
  suggestions: AiSuggestion[];
  setSuggestions: Dispatch<SetStateAction<AiSuggestion[]>>;
  onDismiss: (id: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/restaurant-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      if (data.suggestions?.length > 0) {
        setSuggestions((prev) => [...prev, ...data.suggestions]);
      } else {
        setError("Couldn't come up with anything new — try again in a bit.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function accept(suggestion: AiSuggestion) {
    const content = suggestion.content as unknown as RestaurantSuggestionContent;
    const supabase = createClient();
    setSuggestions((prev) => prev.map((s) => (s.id === suggestion.id ? { ...s, status: "accepted" } : s)));
    await Promise.all([
      supabase.from("restaurants").insert({
        trip_id: tripId,
        name: content.name,
        cuisine: content.cuisine,
        notes: content.notes,
        created_by: currentUserId,
      }),
      supabase.from("ai_suggestions").update({ status: "accepted" }).eq("id", suggestion.id),
    ]);
  }

  return (
    <AiSectionCard
      title="Restaurant suggestions"
      description="Based on your destination and the cuisines your group already likes."
      actionLabel={suggestions.length > 0 ? "Suggest more" : "Suggest restaurants"}
      onGenerate={generate}
      loading={loading}
      error={error}
    >
      <AnimatePresence initial={false}>
        {suggestions.map((s) => {
          const content = s.content as unknown as RestaurantSuggestionContent;
          return (
            <motion.div
              key={s.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl border border-line bg-paper p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-ink">{content.name}</p>
                <Badge tone="green">{content.cuisine}</Badge>
                {content.nearLabel && (
                  <span className="flex items-center gap-1 text-xs text-ink-soft">
                    <MapPin className="h-3 w-3" />
                    near {content.nearLabel}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-soft">{content.notes}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => accept(s)}>
                  Add to list
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDismiss(s.id)}>
                  Dismiss
                </Button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {suggestions.length === 0 && <p className="text-sm text-ink-soft">No open suggestions right now.</p>}
    </AiSectionCard>
  );
}
