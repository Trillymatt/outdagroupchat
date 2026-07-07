"use client";

import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeList, useRealtimeJoinList } from "@/lib/hooks/use-realtime-list";
import { ItineraryDayColumn } from "@/components/itinerary/itinerary-day-column";
import type { ItineraryFormValues } from "@/components/itinerary/itinerary-item-form";
import type { ItineraryItem } from "@/lib/types/trip";

interface ItineraryVoteRow {
  itinerary_item_id: string;
  user_id: string;
  trip_id: string;
  created_at: string;
}

export function ItineraryClient({
  tripId,
  currentUserId,
  canEditOthers,
  initialItems,
  initialVotes,
  days,
  authorLookup,
}: {
  tripId: string;
  currentUserId: string;
  canEditOthers: boolean;
  initialItems: ItineraryItem[];
  initialVotes: ItineraryVoteRow[];
  days: string[];
  authorLookup: Map<string, { name: string; color?: string }>;
}) {
  const [items, setItems] = useRealtimeList<ItineraryItem>("itinerary_items", tripId, initialItems);
  const [votes, setVotes] = useRealtimeJoinList<ItineraryVoteRow>(
    "itinerary_votes",
    tripId,
    initialVotes,
    (v) => `${v.itinerary_item_id}:${v.user_id}`,
  );

  const votesByItem = useMemo(() => {
    const map = new Map<string, ItineraryVoteRow[]>();
    for (const v of votes) map.set(v.itinerary_item_id, [...(map.get(v.itinerary_item_id) ?? []), v]);
    return map;
  }, [votes]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, ItineraryItem[]>();
    for (const day of days) map.set(day, []);
    for (const item of items) {
      if (!map.has(item.day)) map.set(item.day, []);
      map.get(item.day)!.push(item);
    }
    for (const list of map.values()) list.sort((a, b) => a.position - b.position);
    return map;
  }, [items, days]);

  const allDays = useMemo(() => Array.from(itemsByDay.keys()).sort(), [itemsByDay]);

  async function handleAdd(day: string, values: ItineraryFormValues) {
    const supabase = createClient();
    const dayItems = itemsByDay.get(day) ?? [];
    const maxPosition = dayItems.length > 0 ? Math.max(...dayItems.map((i) => i.position)) + 1 : 0;

    const { data, error } = await supabase
      .from("itinerary_items")
      .insert({
        trip_id: tripId,
        day: values.day,
        time: values.time || null,
        title: values.title.trim(),
        description: values.description.trim() || null,
        location: values.location.trim() || null,
        category: values.category,
        cost: values.cost ? Number(values.cost) : null,
        link: values.link.trim() || null,
        created_by: currentUserId,
        position: maxPosition,
      })
      .select()
      .single();

    if (!error && data) {
      setItems((prev) => (prev.some((i) => i.id === data.id) ? prev : [...prev, data]));
    }
  }

  async function handleEdit(item: ItineraryItem, values: ItineraryFormValues) {
    const supabase = createClient();
    const patch = {
      day: values.day,
      time: values.time || null,
      title: values.title.trim(),
      description: values.description.trim() || null,
      location: values.location.trim() || null,
      category: values.category,
      cost: values.cost ? Number(values.cost) : null,
      link: values.link.trim() || null,
    };

    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i)));
    await supabase.from("itinerary_items").update(patch).eq("id", item.id);
  }

  async function toggleVote(itemId: string) {
    const supabase = createClient();
    const mine = votes.some((v) => v.itinerary_item_id === itemId && v.user_id === currentUserId);
    if (mine) {
      setVotes((prev) => prev.filter((v) => !(v.itinerary_item_id === itemId && v.user_id === currentUserId)));
      await supabase.from("itinerary_votes").delete().eq("itinerary_item_id", itemId).eq("user_id", currentUserId);
    } else {
      setVotes((prev) => [...prev, { itinerary_item_id: itemId, user_id: currentUserId, trip_id: tripId, created_at: new Date().toISOString() }]);
      await supabase.from("itinerary_votes").insert({ itinerary_item_id: itemId, user_id: currentUserId, trip_id: tripId });
    }
  }

  async function handleDelete(item: ItineraryItem) {
    if (!confirm(`Remove "${item.title}" from the itinerary?`)) return;
    const supabase = createClient();
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await supabase.from("itinerary_items").delete().eq("id", item.id);
  }

  async function handleReorder(moved: ItineraryItem, newPosition: number) {
    const supabase = createClient();
    setItems((prev) => prev.map((i) => (i.id === moved.id ? { ...i, position: newPosition } : i)));
    await supabase.from("itinerary_items").update({ position: newPosition }).eq("id", moved.id);
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {allDays.map((day) => (
        <ItineraryDayColumn
          key={day}
          day={day}
          items={itemsByDay.get(day) ?? []}
          authorLookup={authorLookup}
          currentUserId={currentUserId}
          canEditOthers={canEditOthers}
          votesByItem={votesByItem}
          onToggleVote={toggleVote}
          onAdd={(values) => handleAdd(day, values)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onReorder={handleReorder}
        />
      ))}
    </div>
  );
}
