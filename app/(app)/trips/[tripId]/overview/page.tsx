import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TripDetailsCard } from "@/components/trips/trip-details-card";
import { TripLegsCard } from "@/components/trips/trip-legs-card";
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
      "id, name, destination, start_date, end_date, cover_image, invite_code, trip_members(user_id, display_name, role, can_edit_lodging, can_edit_food, can_edit_itinerary, can_edit_flights, profiles(name, avatar_color))",
    )
    .eq("id", tripId)
    .single();

  if (!trip) notFound();

  const members = trip.trip_members as unknown as MemberRow[];
  const isOwner = members.some((m) => m.user_id === user.id && m.role === "owner");
  const datesLocked = Boolean(trip.start_date && trip.end_date);

  const [{ data: availabilityRows }, { data: legs }] = await Promise.all([
    supabase.from("trip_date_availability").select("*").eq("trip_id", tripId),
    supabase.from("trip_legs").select("*").eq("trip_id", tripId).order("start_date", { ascending: true }),
  ]);
  const availabilityWindow = computeAvailabilityWindow({ start_date: trip.start_date, end_date: trip.end_date });
  const memberList = members.map((m) => ({ userId: m.user_id, name: m.profiles?.name ?? m.display_name, color: m.profiles?.avatar_color }));

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <TripDetailsCard
          tripId={tripId}
          initial={{
            name: trip.name,
            destination: trip.destination,
            start_date: trip.start_date,
            end_date: trip.end_date,
            cover_image: trip.cover_image,
          }}
        />
        <TripLegsCard tripId={tripId} currentUserId={user.id} initialLegs={legs ?? []} />
        <DateAvailability
          tripId={tripId}
          currentUserId={user.id}
          initialAvailability={availabilityRows ?? []}
          members={memberList}
          windowStart={availabilityWindow.start}
          windowEnd={availabilityWindow.end}
          lockedStart={datesLocked ? trip.start_date : null}
          lockedEnd={datesLocked ? trip.end_date : null}
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
