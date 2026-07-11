"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeList, useRealtimeJoinList } from "@/lib/hooks/use-realtime-list";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FoodCard } from "@/components/food/food-card";
import { FoodForm, type FoodFormValues } from "@/components/food/food-form";
import { RestaurantSuggestionsSection } from "@/components/assistant/restaurant-suggestions-section";
import type { Restaurant, AiSuggestion } from "@/lib/types/trip";

interface RestaurantVoteRow {
  restaurant_id: string;
  user_id: string;
  trip_id: string;
  created_at: string;
}

export function FoodClient({
  tripId,
  currentUserId,
  canEditOthers,
  initialRestaurants,
  initialVotes,
  memberLookup,
  initialSuggestions,
}: {
  tripId: string;
  currentUserId: string;
  canEditOthers: boolean;
  initialRestaurants: Restaurant[];
  initialVotes: RestaurantVoteRow[];
  memberLookup: Map<string, { name: string; color?: string }>;
  initialSuggestions: AiSuggestion[];
}) {
  const [restaurants, setRestaurants] = useRealtimeList<Restaurant>("restaurants", tripId, initialRestaurants);
  const [votes, setVotes] = useRealtimeJoinList<RestaurantVoteRow>(
    "restaurant_votes",
    tripId,
    initialVotes,
    (v) => `${v.restaurant_id}:${v.user_id}`,
  );
  const [suggestions, setSuggestions] = useRealtimeList<AiSuggestion>("ai_suggestions", tripId, initialSuggestions);
  const [adding, setAdding] = useState(false);

  const restaurantSuggestions = useMemo(
    () => suggestions.filter((s) => s.type === "restaurant" && s.status === "suggested"),
    [suggestions],
  );

  async function dismissSuggestion(id: string) {
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, status: "dismissed" } : s)));
    const supabase = createClient();
    await supabase.from("ai_suggestions").update({ status: "dismissed" }).eq("id", id);
  }

  const votesByRestaurant = useMemo(() => {
    const map = new Map<string, RestaurantVoteRow[]>();
    for (const v of votes) map.set(v.restaurant_id, [...(map.get(v.restaurant_id) ?? []), v]);
    return map;
  }, [votes]);

  const sorted = useMemo(
    () => [...restaurants].sort((a, b) => (votesByRestaurant.get(b.id)?.length ?? 0) - (votesByRestaurant.get(a.id)?.length ?? 0)),
    [restaurants, votesByRestaurant],
  );

  async function handleAdd(values: FoodFormValues) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("restaurants")
      .insert({
        trip_id: tripId,
        name: values.name.trim(),
        url: values.url.trim() || null,
        cuisine: values.cuisine.trim() || null,
        notes: values.notes.trim() || null,
        created_by: currentUserId,
      })
      .select()
      .single();

    if (!error && data) {
      setRestaurants((prev) => (prev.some((r) => r.id === data.id) ? prev : [...prev, data]));
      setAdding(false);
    }
  }

  async function toggleVote(restaurantId: string) {
    const supabase = createClient();
    const mine = votes.some((v) => v.restaurant_id === restaurantId && v.user_id === currentUserId);
    if (mine) {
      setVotes((prev) => prev.filter((v) => !(v.restaurant_id === restaurantId && v.user_id === currentUserId)));
      await supabase.from("restaurant_votes").delete().eq("restaurant_id", restaurantId).eq("user_id", currentUserId);
    } else {
      setVotes((prev) => [...prev, { restaurant_id: restaurantId, user_id: currentUserId, trip_id: tripId, created_at: new Date().toISOString() }]);
      await supabase.from("restaurant_votes").insert({ restaurant_id: restaurantId, user_id: currentUserId, trip_id: tripId });
    }
  }

  async function handleDelete(restaurantId: string) {
    if (!confirm("Remove this recommendation?")) return;
    const supabase = createClient();
    setRestaurants((prev) => prev.filter((r) => r.id !== restaurantId));
    await supabase.from("restaurants").delete().eq("id", restaurantId);
  }

  return (
    <div className="space-y-6">
      <RestaurantSuggestionsSection
        tripId={tripId}
        currentUserId={currentUserId}
        suggestions={restaurantSuggestions}
        setSuggestions={setSuggestions}
        onDismiss={dismissSuggestion}
      />
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">Add a recommendation</h2>
          <Button size="sm" variant={adding ? "ghost" : "primary"} onClick={() => setAdding((v) => !v)}>
            <Plus className="h-3.5 w-3.5" />
            {adding ? "Cancel" : "Add place"}
          </Button>
        </div>
        <AnimatePresence initial={false}>
          {adding && <FoodForm key="add-form" onCancel={() => setAdding(false)} onSubmit={handleAdd} />}
        </AnimatePresence>
      </Card>

      {sorted.length === 0 ? (
        <EmptyState title="No recommendations yet" description="Add a restaurant or food spot for the group to vote on." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <AnimatePresence initial={false}>
            {sorted.map((restaurant) => {
              const restaurantVotes = votesByRestaurant.get(restaurant.id) ?? [];
              return (
                <FoodCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  tripId={tripId}
                  currentUserId={currentUserId}
                  authorsById={memberLookup}
                  voteCount={restaurantVotes.length}
                  votedByMe={restaurantVotes.some((v) => v.user_id === currentUserId)}
                  voters={restaurantVotes.map((v) => memberLookup.get(v.user_id) ?? { name: "Someone" })}
                  authorName={memberLookup.get(restaurant.created_by)?.name}
                  canEdit={restaurant.created_by === currentUserId || canEditOthers}
                  onToggleVote={() => toggleVote(restaurant.id)}
                  onDelete={() => handleDelete(restaurant.id)}
                />
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
