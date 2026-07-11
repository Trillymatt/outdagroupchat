"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/actions/notify";

export async function leaveTripAction(tripId: string) {
  const supabase = await createClient();
  await supabase.rpc("leave_trip", { p_trip_id: tripId });
  redirect("/dashboard");
}

export async function removeTripMemberAction(tripId: string, userId: string) {
  const supabase = await createClient();
  await supabase.rpc("remove_trip_member", { p_trip_id: tripId, p_user_id: userId });
  revalidatePath(`/trips/${tripId}`);
}

export async function deleteTripAction(tripId: string) {
  const supabase = await createClient();
  await supabase.rpc("delete_trip", { p_trip_id: tripId });
  redirect("/dashboard");
}

export async function setTripMemberPermissionAction(
  tripId: string,
  userId: string,
  patch: Partial<Record<"can_edit_lodging" | "can_edit_food" | "can_edit_itinerary" | "can_edit_flights", boolean>>,
) {
  const supabase = await createClient();
  await supabase.rpc("set_trip_member_permission", {
    p_trip_id: tripId,
    p_user_id: userId,
    p_can_edit_lodging: patch.can_edit_lodging,
    p_can_edit_food: patch.can_edit_food,
    p_can_edit_itinerary: patch.can_edit_itinerary,
    p_can_edit_flights: patch.can_edit_flights,
  });
  revalidatePath(`/trips/${tripId}/overview`);
}

export async function approveJoinRequestAction(
  tripId: string,
  requestId: string,
  permissions: { can_edit_lodging: boolean; can_edit_food: boolean; can_edit_itinerary: boolean; can_edit_flights: boolean },
) {
  const supabase = await createClient();
  const { data: request } = await supabase.from("trip_join_requests").select("user_id, trips(name)").eq("id", requestId).single();

  const { error } = await supabase.rpc("approve_join_request", {
    p_request_id: requestId,
    p_can_edit_lodging: permissions.can_edit_lodging,
    p_can_edit_food: permissions.can_edit_food,
    p_can_edit_itinerary: permissions.can_edit_itinerary,
    p_can_edit_flights: permissions.can_edit_flights,
  });

  if (!error && request) {
    const tripName = (request as unknown as { trips: { name: string } | null }).trips?.name ?? "the trip";
    await notifyUser(request.user_id, `You're in! Your request to join "${tripName}" was approved.`);
  }

  revalidatePath(`/trips/${tripId}/settings`);
}

export async function denyJoinRequestAction(tripId: string, requestId: string) {
  const supabase = await createClient();
  const { data: request } = await supabase.from("trip_join_requests").select("user_id, trips(name)").eq("id", requestId).single();

  const { error } = await supabase.rpc("deny_join_request", { p_request_id: requestId });

  if (!error && request) {
    const tripName = (request as unknown as { trips: { name: string } | null }).trips?.name ?? "the trip";
    await notifyUser(request.user_id, `Your request to join "${tripName}" wasn't approved.`);
  }

  revalidatePath(`/trips/${tripId}/settings`);
}
