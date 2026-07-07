"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
