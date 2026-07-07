import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BudgetClient } from "@/components/budget/budget-client";
import type { Flight, LodgingOption, ItineraryItem } from "@/lib/types/trip";

export const metadata: Metadata = { title: "Budget — Tandem" };

export default async function BudgetPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: trip }, { data: members }, { data: flights }, { data: lodging }, { data: itineraryItems }] = await Promise.all([
    supabase.from("trips").select("start_date, end_date").eq("id", tripId).single(),
    supabase.from("trip_members").select("user_id, display_name, profiles(name)").eq("trip_id", tripId),
    supabase.from("flights").select("*").eq("trip_id", tripId),
    supabase.from("lodging_options").select("*").eq("trip_id", tripId),
    supabase.from("itinerary_items").select("*").eq("trip_id", tripId),
  ]);

  if (!trip) notFound();

  const nights =
    trip.start_date && trip.end_date
      ? Math.max(1, Math.round((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86_400_000))
      : null;

  const memberList = (members ?? []).map((m) => {
    const profile = (m as unknown as { profiles: { name: string } | null }).profiles;
    return { userId: m.user_id, name: profile?.name ?? m.display_name };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
        <p className="text-sm text-ink-soft">Per-person and per-trip totals, updated live as costs come in.</p>
      </div>
      <BudgetClient
        tripId={tripId}
        members={memberList}
        initialFlights={(flights ?? []) as Flight[]}
        initialLodging={(lodging ?? []) as LodgingOption[]}
        initialItineraryItems={(itineraryItems ?? []) as ItineraryItem[]}
        nights={nights}
      />
    </div>
  );
}
