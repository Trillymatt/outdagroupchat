import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InviteCodeCard } from "@/components/trips/invite-code-card";
import { MemberList, type MemberRow } from "@/components/trips/member-list";
import { DangerZone } from "@/components/trips/danger-zone";

export const metadata: Metadata = { title: "Settings — Tandem" };

export default async function TripSettingsPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: trip } = await supabase
    .from("trips")
    .select(
      "id, invite_code, trip_members(user_id, display_name, role, can_edit_lodging, can_edit_food, can_edit_itinerary, can_edit_flights, profiles(name, avatar_color))",
    )
    .eq("id", tripId)
    .single();

  if (!trip) notFound();

  const members = trip.trip_members as unknown as MemberRow[];
  const isOwner = members.some((m) => m.user_id === user.id && m.role === "owner");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <InviteCodeCard code={trip.invite_code} />
      <MemberList tripId={tripId} initialMembers={members} currentUserId={user.id} isOwner={isOwner} />
      {isOwner && <DangerZone tripId={tripId} />}
    </div>
  );
}
