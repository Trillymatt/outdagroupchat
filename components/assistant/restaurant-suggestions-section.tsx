"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { ExternalLink, MapPin } from "lucide-react";
import { AiSectionCard } from "./ai-section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { AiSuggestion } from "@/lib/types/trip";
import type { Json } from "@/lib/supabase/database.types";
import { appleMapsSearchUrl } from "@/lib/utils/maps";

interface RestaurantSuggestionContent {
  name: string;
  cuisine: string;
  notes: string;
  location?: string | null;
  nearLabel?: string | null;
}

const emptyIdea = { name: "", cuisine: "", notes: "", location: "" };

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
  const [showForm, setShowForm] = useState(false);
  const [idea, setIdea] = useState(emptyIdea);
  const [savingIdea, setSavingIdea] = useState(false);

  async function addIdea() {
    if (!idea.name.trim()) return;
    setSavingIdea(true);
    const supabase = createClient();
    const content: RestaurantSuggestionContent = {
      name: idea.name.trim(),
      cuisine: idea.cuisine.trim(),
      notes: idea.notes.trim(),
      location: idea.location.trim() || null,
    };
    const { data, error: insertError } = await supabase
      .from("ai_suggestions")
      .insert({ trip_id: tripId, type: "restaurant", status: "suggested", created_by: currentUserId, content: content as unknown as Json })
      .select()
      .single();
    setSavingIdea(false);
    if (!insertError && data) {
      setSuggestions((prev) => (prev.some((s) => s.id === data.id) ? prev : [...prev, data as AiSuggestion]));
      setIdea(emptyIdea);
      setShowForm(false);
    }
  }

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
      description="Add your own spots or let AI suggest some — save favorites here, then plan a day for them."
      actionLabel={suggestions.length > 0 ? "Suggest more" : "Suggest restaurants"}
      onGenerate={generate}
      loading={loading}
      error={error}
      hasContent={suggestions.length > 0}
      contentLabel={`${suggestions.length} ${suggestions.length === 1 ? "place" : "places"}`}
      secondaryAction={{ label: showForm ? "Cancel" : "Add place", onClick: () => setShowForm((v) => !v), active: showForm }}
      formSlot={
        showForm ? (
          <div className="space-y-2.5">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <Label htmlFor="food-idea-name">Place</Label>
                <Input
                  id="food-idea-name"
                  value={idea.name}
                  onChange={(e) => setIdea((v) => ({ ...v, name: e.target.value }))}
                  placeholder="Trattoria da Enzo"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="food-idea-cuisine">Cuisine (optional)</Label>
                <Input
                  id="food-idea-cuisine"
                  value={idea.cuisine}
                  onChange={(e) => setIdea((v) => ({ ...v, cuisine: e.target.value }))}
                  placeholder="Italian"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="food-idea-notes">Notes (optional)</Label>
              <Textarea
                id="food-idea-notes"
                value={idea.notes}
                onChange={(e) => setIdea((v) => ({ ...v, notes: e.target.value }))}
                placeholder="Why it's worth a visit"
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={addIdea} disabled={savingIdea || !idea.name.trim()}>
                {savingIdea ? "Adding…" : "Add possibility"}
              </Button>
            </div>
          </div>
        ) : null
      }
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
