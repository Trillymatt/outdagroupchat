import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FlightsClient } from "@/components/flights/flights-client";
import { FlightSuggestionsClient } from "@/components/flights/flight-suggestions-client";
import type { Flight, FlightSuggestion } from "@/lib/types/trip";

export const metadata: Metadata = { title: "Flights — Tandem" };

export default async function FlightsPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: trip }, { data: flights }, { data: members }, { data: suggestions }, { data: suggestionVotes }] = await Promise.all([
    supabase.from("trips").select("destination, start_date, end_date").eq("id", tripId).single(),
    supabase.from("flights").select("*").eq("trip_id", tripId),
    supabase
      .from("trip_members")
      .select("user_id, display_name, role, can_edit_flights, profiles(name, avatar_color)")
      .eq("trip_id", tripId)
      .order("joined_at", { ascending: true }),
    supabase.from("flight_suggestions").select("*").eq("trip_id", tripId).order("created_at", { ascending: true }),
    supabase.from("flight_suggestion_votes").select("*").eq("trip_id", tripId),
  ]);

  if (!trip) notFound();

  const memberList = (members ?? []).map((m) => {
    const profile = (m as unknown as { profiles: { name: string; avatar_color: string } | null }).profiles;
    return { userId: m.user_id, name: profile?.name ?? m.display_name, color: profile?.avatar_color };
  });
  const memberLookup = new Map(memberList.map((m) => [m.userId, { name: m.name, color: m.color }]));

  const me = (members ?? []).find((m) => m.user_id === user.id);
  const canEditOthers = me?.role === "owner" || me?.can_edit_flights === true;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Flights</h1>
        <p className="text-sm text-ink-soft">Everyone tracks their own flight — book directly with the airline, link it here.</p>
      </div>
      <FlightsClient
        tripId={tripId}
        currentUserId={user.id}
        members={memberList}
        initialFlights={(flights ?? []) as Flight[]}
        destination={trip.destination}
        startDate={trip.start_date}
        endDate={trip.end_date}
      />

      <div>
        <h2 className="text-xl font-semibold tracking-tight">Search &amp; suggest flights</h2>
        <p className="text-sm text-ink-soft">Find real flights around your trip dates and suggest the best ones to the group.</p>
      </div>
      <FlightSuggestionsClient
        tripId={tripId}
        currentUserId={user.id}
        canEditOthers={canEditOthers}
        initialSuggestions={(suggestions ?? []) as FlightSuggestion[]}
        initialVotes={suggestionVotes ?? []}
        memberLookup={memberLookup}
        startDate={trip.start_date}
        endDate={trip.end_date}
      />
    </div>
  );
}
