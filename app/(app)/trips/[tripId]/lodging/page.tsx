import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LodgingClient } from "@/components/lodging/lodging-client";
import type { LodgingOption } from "@/lib/types/trip";

export const metadata: Metadata = { title: "Lodging — Tandem" };

export default async function LodgingPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: options }, { data: votes }, { data: members }, { data: trip }] = await Promise.all([
    supabase.from("lodging_options").select("*").eq("trip_id", tripId).order("created_at", { ascending: true }),
    supabase.from("lodging_votes").select("*").eq("trip_id", tripId),
    supabase.from("trip_members").select("user_id, display_name, role, can_edit_lodging, profiles(name, avatar_color)").eq("trip_id", tripId),
    supabase.from("trips").select("start_date, end_date").eq("id", tripId).single(),
  ]);

  const memberLookup = new Map(
    (members ?? []).map((m) => {
      const profile = (m as unknown as { profiles: { name: string; avatar_color: string } | null }).profiles;
      return [m.user_id, { name: profile?.name ?? m.display_name, color: profile?.avatar_color }];
    }),
  );

  const me = (members ?? []).find((m) => m.user_id === user.id);
  const canEditOthers = me?.role === "owner" || me?.can_edit_lodging === true;

  const nights =
    trip?.start_date && trip?.end_date
      ? Math.max(1, Math.round((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86_400_000))
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lodging</h1>
        <p className="text-sm text-ink-soft">Propose places to stay and vote as a group.</p>
      </div>
      <LodgingClient
        tripId={tripId}
        currentUserId={user.id}
        canEditOthers={canEditOthers}
        initialOptions={(options ?? []) as LodgingOption[]}
        initialVotes={votes ?? []}
        memberLookup={memberLookup}
        memberCount={Math.max(1, (members ?? []).length)}
        nights={nights}
      />
    </div>
  );
}
