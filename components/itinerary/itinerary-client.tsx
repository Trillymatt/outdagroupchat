"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CalendarPlus, LayoutGrid, Map as MapIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeList, useRealtimeJoinList } from "@/lib/hooks/use-realtime-list";
import { Button } from "@/components/ui/button";
import { ItineraryDayColumn } from "@/components/itinerary/itinerary-day-column";
import type { ItineraryFormValues } from "@/components/itinerary/itinerary-item-form";
import type { ItineraryItem, TripLeg } from "@/lib/types/trip";
import { formatDateRange } from "@/lib/utils/dates";

// Leaflet touches `window` at import time, so the map can only load in the browser
const ItineraryMap = dynamic(() => import("@/components/itinerary/itinerary-map").then((m) => m.ItineraryMap), {
  ssr: false,
  loading: () => <div className="h-[420px] animate-pulse rounded-2xl border border-line bg-ink/[0.03]" />,
});

interface ItineraryVoteRow {
  itinerary_item_id: string;
  user_id: string;
  trip_id: string;
  created_at: string;
}

/** Geocode a free-text location and persist coords on the item. Fire-and-forget. */
async function geocodeAndSave(itemId: string, location: string | null) {
  if (!location) return;
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(location)}`);
    if (!res.ok) return;
    const { lat, lng } = await res.json();
    if (typeof lat !== "number" || typeof lng !== "number") return;
    const supabase = createClient();
    await supabase.from("itinerary_items").update({ lat, lng }).eq("id", itemId);
  } catch {
    // Geocoding is best-effort; the item just won't appear on the map
  }
}

export function ItineraryClient({
  tripId,
  currentUserId,
  canEditOthers,
  initialItems,
  initialVotes,
  days,
  authorLookup,
  initialLegs,
}: {
  tripId: string;
  currentUserId: string;
  canEditOthers: boolean;
  initialItems: ItineraryItem[];
  initialVotes: ItineraryVoteRow[];
  days: string[];
  authorLookup: Map<string, { name: string; color?: string }>;
  initialLegs: TripLeg[];
}) {
  const [legs] = useRealtimeList<TripLeg>("trip_legs", tripId, initialLegs);
  const [items, setItems] = useRealtimeList<ItineraryItem>("itinerary_items", tripId, initialItems);
  const [votes, setVotes] = useRealtimeJoinList<ItineraryVoteRow>(
    "itinerary_votes",
    tripId,
    initialVotes,
    (v) => `${v.itinerary_item_id}:${v.user_id}`,
  );
  const [view, setView] = useState<"board" | "map">("board");

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

  // Groups days under whichever leg's date range contains them (legs are
  // trip metadata, not stored per-item — see 20260711010000_trip_legs.sql).
  // With no legs, this collapses to a single unlabeled group so the board
  // looks exactly like it did before legs existed.
  const dayGroups = useMemo(() => {
    if (legs.length === 0) return [{ leg: null as TripLeg | null, days: allDays }];
    const sortedLegs = [...legs].sort((a, b) => a.start_date.localeCompare(b.start_date));
    const groups: { leg: TripLeg | null; days: string[] }[] = sortedLegs.map((leg) => ({ leg, days: [] }));
    const unassigned: string[] = [];
    for (const day of allDays) {
      const group = groups.find((g) => g.leg && day >= g.leg.start_date && day <= g.leg.end_date);
      if (group) group.days.push(day);
      else unassigned.push(day);
    }
    if (unassigned.length > 0) groups.push({ leg: null, days: unassigned });
    return groups;
  }, [legs, allDays]);

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
      void geocodeAndSave(data.id, data.location);
    }
  }

  async function handleEdit(item: ItineraryItem, values: ItineraryFormValues) {
    const supabase = createClient();
    const locationChanged = (values.location.trim() || null) !== item.location;
    const patch = {
      day: values.day,
      time: values.time || null,
      title: values.title.trim(),
      description: values.description.trim() || null,
      location: values.location.trim() || null,
      category: values.category,
      cost: values.cost ? Number(values.cost) : null,
      link: values.link.trim() || null,
      ...(locationChanged ? { lat: null, lng: null } : {}),
    };

    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i)));
    await supabase.from("itinerary_items").update(patch).eq("id", item.id);
    if (locationChanged) void geocodeAndSave(item.id, patch.location);
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-line bg-paper p-1">
          <Button size="sm" variant={view === "board" ? "primary" : "ghost"} onClick={() => setView("board")}>
            <LayoutGrid className="h-3.5 w-3.5" />
            Board
          </Button>
          <Button size="sm" variant={view === "map" ? "primary" : "ghost"} onClick={() => setView("map")}>
            <MapIcon className="h-3.5 w-3.5" />
            Map
          </Button>
        </div>
        <a
          href={`/api/trips/${tripId}/calendar`}
          download
          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-green/40 hover:bg-green/5"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          Add to calendar
        </a>
      </div>

      {view === "map" ? (
        <ItineraryMap items={items} days={allDays} />
      ) : (
        <div className="space-y-8">
          {dayGroups.map((group) => (
            <div key={group.leg?.id ?? "unassigned"} className="space-y-3">
              {legs.length > 0 && (
                <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
                  {group.leg ? `${group.leg.city} · ${formatDateRange(group.leg.start_date, group.leg.end_date)}` : "Other days"}
                </h3>
              )}
              <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
                {group.days.map((day) => (
                  <ItineraryDayColumn
                    key={day}
                    day={day}
                    tripId={tripId}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
