"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { notifyOptedInMembers } from "@/lib/actions/notify";

export type TripFormState = { error?: string } | undefined;

export async function createTripAction(_prevState: TripFormState, formData: FormData): Promise<TripFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();

  if (!name) return { error: "Trip name is required." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_trip", {
    p_name: name,
    p_destination: destination || undefined,
    p_start_date: startDate || undefined,
    p_end_date: endDate || undefined,
  });

  if (error || !data) return { error: error?.message ?? "Could not create the trip." };
  redirect(`/trips/${data.id}/overview`);
}

// Shared join logic used by the form action below and the one-tap /join/[code] page.
export async function joinTripByCode(code: string): Promise<{ tripId: string } | { error: string }> {
  const inviteCode = code.trim();
  if (!inviteCode) return { error: "Enter an invite code." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_trip_by_code", { p_invite_code: inviteCode });

  if (error || !data) return { error: "That invite code doesn't match a trip." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();
    await notifyOptedInMembers(data.id, `${profile?.name ?? "Someone"} just joined "${data.name}" on Tandem.`, user.id);
  }

  return { tripId: data.id };
}

export async function joinTripAction(_prevState: TripFormState, formData: FormData): Promise<TripFormState> {
  const result = await joinTripByCode(String(formData.get("invite_code") ?? ""));
  if ("error" in result) return { error: result.error };
  redirect(`/trips/${result.tripId}/overview`);
}
