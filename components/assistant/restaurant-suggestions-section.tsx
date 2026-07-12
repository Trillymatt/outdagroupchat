"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { ExternalLink, MapPin } from "lucide-react";
import { AiSectionCard } from "./ai-section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AiSuggestion } from "@/lib/types/trip";
import { appleMapsSearchUrl } from "@/lib/utils/maps";

interface RestaurantSuggestionContent {
  name: string;
  cuisine: string;
  notes: string;
  location?: string | null;
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
        url: appleMapsSearchUrl(content.name, content.location ?? content.nearLabel),
        created_by: currentUserId,
      }),
      supabase.from("ai_suggestions").update({ status: "accepted" }).eq("id", suggestion.id),
    ]);
  }

  return (
    <AiSectionCard
      title="Restaurant possibilities"
      description="Save favorites here first, then choose a day once the group is ready."
      actionLabel={suggestions.length > 0 ? "Suggest more" : "Suggest restaurants"}
      onGenerate={generate}
      loading={loading}
      error={error}
      hasContent={suggestions.length > 0}
      contentLabel={`${suggestions.length} ${suggestions.length === 1 ? "place" : "places"}`}
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
              className="rounded-xl border border-line bg-paper p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{content.name}</p>
                  <Badge tone="green" className="mt-1">{content.cuisine}</Badge>
                </div>
                <a
                  href={appleMapsSearchUrl(content.name, content.location ?? content.nearLabel)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium text-green hover:bg-green/5 sm:min-h-9"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Apple Maps
                </a>
              </div>
              {(content.location || content.nearLabel) && (
                  <span className="mt-1 flex items-center gap-1 text-xs text-ink-soft">
                    <MapPin className="h-3 w-3" />
                    {content.location ?? `Near ${content.nearLabel}`}
                  </span>
              )}
              <p className="mt-1 text-sm text-ink-soft">{content.notes}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" className="flex-1 sm:flex-none" onClick={() => accept(s)}>
                  Save possibility
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDismiss(s.id)}>
                  Dismiss
                </Button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </AiSectionCard>
  );
}
