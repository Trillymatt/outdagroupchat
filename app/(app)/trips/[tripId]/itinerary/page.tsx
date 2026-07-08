import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ItineraryClient } from "@/components/itinerary/itinerary-client";
import type { ItineraryItem } from "@/lib/types/trip";

export const metadata: Metadata = { title: "Itinerary — Tandem" };

function eachDay(start: string, end: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export default async function ItineraryPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: trip }, { data: items }, { data: votes }, { data: members }, { data: comments }] = await Promise.all([
    supabase.from("trips").select("start_date, end_date").eq("id", tripId).single(),
    supabase.from("itinerary_items").select("*").eq("trip_id", tripId).order("day", { ascending: true }).order("position", { ascending: true }),
    supabase.from("itinerary_votes").select("*").eq("trip_id", tripId),
    supabase.from("trip_members").select("user_id, display_name, role, can_edit_itinerary, profiles(name, avatar_color)").eq("trip_id", tripId),
    supabase.from("trip_comments").select("*").eq("trip_id", tripId).eq("entity_type", "itinerary").order("created_at", { ascending: true }),
  ]);

  if (!trip) notFound();

  const me = (members ?? []).find((m) => m.user_id === user.id);
  const canEditOthers = me?.role === "owner" || me?.can_edit_itinerary === true;

  const itemDays = new Set((items ?? []).map((i) => i.day));
  const today = new Date().toISOString().slice(0, 10);

  const days =
    trip.start_date && trip.end_date
      ? eachDay(trip.start_date, trip.end_date)
      : Array.from(new Set([...itemDays, today])).sort();

  const authorLookup = new Map(
    (members ?? []).map((m) => {
      const profile = (m as unknown as { profiles: { name: string; avatar_color: string } | null }).profiles;
      return [m.user_id, { name: profile?.name ?? m.display_name, color: profile?.avatar_color }];
    }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Itinerary</h1>
        <p className="text-sm text-ink-soft">Day-by-day plans, in sync for everyone on the trip.</p>
      </div>
      <ItineraryClient
        tripId={tripId}
        currentUserId={user.id}
        canEditOthers={canEditOthers}
        initialItems={(items ?? []) as ItineraryItem[]}
        initialVotes={votes ?? []}
        days={days}
        authorLookup={authorLookup}
        initialComments={comments ?? []}
      />
    </div>
  );
}
