"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/actions/notify";
import { searchCityPhoto, trackDownload } from "@/lib/images/unsplash-client";

export type TripFormState = { error?: string; message?: string } | undefined;

export async function createTripAction(_prevState: TripFormState, formData: FormData): Promise<TripFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim();
  const destinationLat = Number(formData.get("destination_lat") ?? "");
  const destinationLng = Number(formData.get("destination_lng") ?? "");
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

  if (Number.isFinite(destinationLat) && Number.isFinite(destinationLng) && (destinationLat || destinationLng)) {
    await supabase.from("trips").update({ destination_lat: destinationLat, destination_lng: destinationLng }).eq("id", data.id);
  }

  if (destination) {
    const photo = await searchCityPhoto(destination);
    if (photo) {
      await supabase.from("trips").update({ cover_image: photo.url }).eq("id", data.id);
      void trackDownload(photo.downloadLocation);
    }
  }

  redirect(`/trips/${data.id}/overview`);
}

// Shared join logic used by the form action below and the one-tap /join/[code] page.
// Approved/already-a-member callers redirect straight in; everyone else gets
// a pending request that the trip owner has to approve.
export async function requestToJoinByCode(
  code: string,
): Promise<{ tripId: string; alreadyMember: true } | { tripName: string; alreadyMember: false } | { error: string }> {
  const inviteCode = code.trim();
  if (!inviteCode) return { error: "Enter an invite code." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_to_join", { p_invite_code: inviteCode }).single();

  if (error || !data) return { error: "That invite code doesn't match a trip." };

  if (data.out_already_member) {
    return { tripId: data.out_trip_id, alreadyMember: true };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();
    const { data: owner } = await supabase.from("trip_members").select("user_id").eq("trip_id", data.out_trip_id).eq("role", "owner").single();
    if (owner) {
      await notifyUser(owner.user_id, `${profile?.name ?? "Someone"} wants to join "${data.out_trip_name}" — review it on Tandem.`);
    }
  }

  return { tripName: data.out_trip_name, alreadyMember: false };
}

export async function joinTripAction(_prevState: TripFormState, formData: FormData): Promise<TripFormState> {
  const result = await requestToJoinByCode(String(formData.get("invite_code") ?? ""));
  if ("error" in result) return { error: result.error };
  if (result.alreadyMember) redirect(`/trips/${result.tripId}/overview`);
  return { message: `Request sent — you'll get access to "${result.tripName}" once the owner approves.` };
}
