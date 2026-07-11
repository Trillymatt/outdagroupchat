"use client";

import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeList, useRealtimeJoinList } from "@/lib/hooks/use-realtime-list";
import type { AiSuggestion, PackingItem } from "@/lib/types/trip";
import { ItinerarySuggestionsSection } from "./itinerary-suggestions-section";
import { RestaurantSuggestionsSection } from "./restaurant-suggestions-section";
import { PackingListSection } from "./packing-list-section";
import { CatchMeUpSection } from "./catch-me-up-section";

export interface PackingCheckRow {
  packing_item_id: string;
  user_id: string;
  trip_id: string;
  checked: boolean;
}

export function AssistantClient({
  tripId,
  currentUserId,
  initialSuggestions,
  initialPackingItems,
  initialPackingChecks,
}: {
  tripId: string;
  currentUserId: string;
  initialSuggestions: AiSuggestion[];
  initialPackingItems: PackingItem[];
  initialPackingChecks: PackingCheckRow[];
}) {
  const [suggestions, setSuggestions] = useRealtimeList<AiSuggestion>("ai_suggestions", tripId, initialSuggestions);
  const [packingItems, setPackingItems] = useRealtimeList<PackingItem>("packing_items", tripId, initialPackingItems);
  const [packingChecks, setPackingChecks] = useRealtimeJoinList<PackingCheckRow>(
    "packing_item_checks",
    tripId,
    initialPackingChecks,
    (c) => `${c.packing_item_id}:${c.user_id}`,
  );

  const itinerarySuggestions = useMemo(
    () => suggestions.filter((s) => s.type === "itinerary" && s.status === "suggested"),
    [suggestions],
  );
  const restaurantSuggestions = useMemo(
    () => suggestions.filter((s) => s.type === "restaurant" && s.status === "suggested"),
    [suggestions],
  );
  const catchMeUps = useMemo(
    () => suggestions.filter((s) => s.type === "catch_me_up").sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [suggestions],
  );

  async function dismissSuggestion(id: string) {
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, status: "dismissed" } : s)));
    const supabase = createClient();
    await supabase.from("ai_suggestions").update({ status: "dismissed" }).eq("id", id);
  }

  return (
    <div className="space-y-6">
      <ItinerarySuggestionsSection
        tripId={tripId}
        currentUserId={currentUserId}
        suggestions={itinerarySuggestions}
        setSuggestions={setSuggestions}
        onDismiss={dismissSuggestion}
      />
      <RestaurantSuggestionsSection
        tripId={tripId}
        currentUserId={currentUserId}
        suggestions={restaurantSuggestions}
        setSuggestions={setSuggestions}
        onDismiss={dismissSuggestion}
      />
      <PackingListSection
        tripId={tripId}
        currentUserId={currentUserId}
        packingItems={packingItems}
        setPackingItems={setPackingItems}
        packingChecks={packingChecks}
        setPackingChecks={setPackingChecks}
      />
      <CatchMeUpSection tripId={tripId} latest={catchMeUps[0]} setSuggestions={setSuggestions} />
    </div>
  );
}
