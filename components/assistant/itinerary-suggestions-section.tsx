"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { AiSectionCard } from "./ai-section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AiSuggestion } from "@/lib/types/trip";
import type { ItineraryCategory } from "@/lib/supabase/database.types";
import { formatDay } from "@/lib/utils/dates";
import { Select } from "@/components/ui/input";

interface ItinerarySuggestionContent {
  day: string;
  time: string | null;
  title: string;
  description: string;
  location: string | null;
  category: ItineraryCategory;
  rationale: string;
}

export function ItinerarySuggestionsSection({
  tripId,
  currentUserId,
  suggestions,
  setSuggestions,
  onDismiss,
  days,
}: {
  tripId: string;
  currentUserId: string;
  suggestions: AiSuggestion[];
  setSuggestions: Dispatch<SetStateAction<AiSuggestion[]>>;
  onDismiss: (id: string) => void;
  days?: string[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<Record<string, string>>({});

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/itinerary-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      if (data.suggestions?.length > 0) {
        setSuggestions((prev) => [...prev, ...data.suggestions]);
      } else {
        setError("No obvious gaps found right now — try again once you've added some plans.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function accept(suggestion: AiSuggestion) {
    const content = suggestion.content as unknown as ItinerarySuggestionContent;
    const supabase = createClient();
    setSuggestions((prev) => prev.map((s) => (s.id === suggestion.id ? { ...s, status: "accepted" } : s)));
    await Promise.all([
      supabase.from("itinerary_items").insert({
        trip_id: tripId,
        day: selectedDays[suggestion.id] ?? content.day,
        time: content.time,
        title: content.title,
        description: content.description,
        location: content.location,
        category: content.category,
        created_by: currentUserId,
        position: Date.parse(suggestion.created_at),
      }),
      supabase.from("ai_suggestions").update({ status: "accepted" }).eq("id", suggestion.id),
    ]);
  }

  return (
    <AiSectionCard
      title="Potential things to do"
      description="Keep ideas here until you choose the day they belong on."
      actionLabel={suggestions.length > 0 ? "Suggest more" : "Suggest activities"}
      onGenerate={generate}
      loading={loading}
      error={error}
      hasContent={suggestions.length > 0}
      contentLabel={`${suggestions.length} ${suggestions.length === 1 ? "idea" : "ideas"}`}
    >
      <AnimatePresence initial={false}>
        {suggestions.map((s) => {
          const content = s.content as unknown as ItinerarySuggestionContent;
          return (
            <motion.div
              key={s.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-xl border border-line bg-paper p-3"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                <Badge tone="green">{formatDay(content.day)}</Badge>
                {content.time && <span>{content.time}</span>}
                {content.location && <span>· {content.location}</span>}
              </div>
              <p className="mt-1.5 font-medium text-ink">{content.title}</p>
              <p className="mt-0.5 text-sm text-ink-soft">{content.description}</p>
              <p className="mt-1.5 text-xs italic text-ink-soft/80">{content.rationale}</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                {days && days.length > 0 && (
                  <Select
                    aria-label={`Day for ${content.title}`}
                    value={selectedDays[s.id] ?? content.day}
                    onChange={(event) => setSelectedDays((current) => ({ ...current, [s.id]: event.target.value }))}
                    className="sm:max-w-48"
                  >
                    {days.map((day) => <option key={day} value={day}>{formatDay(day)}</option>)}
                  </Select>
                )}
                <Button size="sm" onClick={() => accept(s)}>
                  Add to day
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
