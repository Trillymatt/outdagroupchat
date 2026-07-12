import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FoodClient } from "@/components/food/food-client";
import type { Restaurant, AiSuggestion } from "@/lib/types/trip";

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

export const metadata: Metadata = { title: "Food — Tandem" };

export default async function FoodPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: trip }, { data: restaurants }, { data: votes }, { data: members }, { data: suggestions }] = await Promise.all([
    supabase.from("trips").select("destination, start_date, end_date").eq("id", tripId).single(),
    supabase.from("restaurants").select("*").eq("trip_id", tripId).order("created_at", { ascending: true }),
    supabase.from("restaurant_votes").select("*").eq("trip_id", tripId),
    supabase.from("trip_members").select("user_id, display_name, role, can_edit_food, profiles(name, avatar_color)").eq("trip_id", tripId),
    supabase.from("ai_suggestions").select("*").eq("trip_id", tripId).eq("type", "restaurant").eq("status", "suggested"),
  ]);

  const memberLookup = new Map(
    (members ?? []).map((m) => {
      const profile = (m as unknown as { profiles: { name: string; avatar_color: string } | null }).profiles;
      return [m.user_id, { name: profile?.name ?? m.display_name, color: profile?.avatar_color }];
    }),
  );

  const me = (members ?? []).find((m) => m.user_id === user.id);
  const canEditOthers = me?.role === "owner" || me?.can_edit_food === true;
  const today = new Date().toISOString().slice(0, 10);
  const days = trip?.start_date && trip.end_date ? eachDay(trip.start_date, trip.end_date) : [today];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Food</h1>
        <p className="text-sm text-ink-soft">Restaurant and food recommendations, upvoted by the group.</p>
      </div>
      <FoodClient
        tripId={tripId}
        currentUserId={user.id}
        canEditOthers={canEditOthers}
        initialRestaurants={(restaurants ?? []) as Restaurant[]}
        initialVotes={votes ?? []}
        memberLookup={memberLookup}
        initialSuggestions={(suggestions ?? []) as AiSuggestion[]}
        days={days}
        destination={trip?.destination}
      />
    </div>
  );
}
