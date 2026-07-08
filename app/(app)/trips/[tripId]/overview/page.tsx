import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TripDetailsCard } from "@/components/trips/trip-details-card";
import { DateProposals } from "@/components/trips/date-proposals";
import { DateAvailability } from "@/components/trips/date-availability";
import { InviteCodeCard } from "@/components/trips/invite-code-card";
import { TripExportsCard } from "@/components/trips/trip-exports-card";
import { MemberList, type MemberRow } from "@/components/trips/member-list";
import { DangerZone } from "@/components/trips/danger-zone";
import { computeAvailabilityWindow } from "@/lib/utils/availability-window";

export const metadata: Metadata = { title: "Overview — Tandem" };

export default async function TripOverviewPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: trip } = await supabase
    .from("trips")
    .select(
      "id, name, destination, start_date, end_date, invite_code, trip_members(user_id, display_name, role, can_edit_lodging, can_edit_food, can_edit_itinerary, can_edit_flights, profiles(name, avatar_color))",
    )
    .eq("id", tripId)
    .single();

  if (!trip) notFound();

  const members = trip.trip_members as unknown as MemberRow[];
  const isOwner = members.some((m) => m.user_id === user.id && m.role === "owner");
  const datesLocked = Boolean(trip.start_date && trip.end_date);

  let proposals: { id: string; trip_id: string; start_date: string; end_date: string; proposed_by: string; created_at: string }[] = [];
  let votes: { proposal_id: string; user_id: string; trip_id: string; created_at: string }[] = [];

  if (!datesLocked) {
    const [{ data: proposalRows }, { data: voteRows }] = await Promise.all([
      supabase.from("trip_date_proposals").select("*").eq("trip_id", tripId).order("created_at", { ascending: true }),
      supabase.from("trip_date_votes").select("*").eq("trip_id", tripId),
    ]);
    proposals = proposalRows ?? [];
    votes = voteRows ?? [];
  }

  const { data: availabilityRows } = await supabase.from("trip_date_availability").select("*").eq("trip_id", tripId);
  const availabilityWindow = computeAvailabilityWindow(proposals, { start_date: trip.start_date, end_date: trip.end_date });
  const memberList = members.map((m) => ({ userId: m.user_id, name: m.profiles?.name ?? m.display_name, color: m.profiles?.avatar_color }));

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <TripDetailsCard
          tripId={tripId}
          initial={{ name: trip.name, destination: trip.destination, start_date: trip.start_date, end_date: trip.end_date }}
        />
        {!datesLocked && (
          <DateProposals tripId={tripId} currentUserId={user.id} initialProposals={proposals} initialVotes={votes} />
        )}
        <DateAvailability
          tripId={tripId}
          currentUserId={user.id}
          initialAvailability={availabilityRows ?? []}
          members={memberList}
          windowStart={availabilityWindow.start}
          windowEnd={availabilityWindow.end}
        />
        {isOwner && <DangerZone tripId={tripId} />}
      </div>
      <div className="space-y-6">
        <InviteCodeCard code={trip.invite_code} />
        <MemberList tripId={tripId} initialMembers={members} currentUserId={user.id} isOwner={isOwner} />
        <TripExportsCard tripId={tripId} />
      </div>
    </div>
  );
}
