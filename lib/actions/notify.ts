"use server";

import { createClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/sms/client";

/** Best-effort — never throws, so a Twilio hiccup never blocks the action that triggered it. */
export async function notifyOptedInMembers(tripId: string, message: string, excludeUserId?: string) {
  try {
    const supabase = await createClient();
    const { data: members } = await supabase
      .from("trip_members")
      .select("user_id, profiles(phone_number, sms_opt_in)")
      .eq("trip_id", tripId);

    const recipients = (members ?? [])
      .filter((m) => m.user_id !== excludeUserId)
      .map((m) => (m as unknown as { profiles: { phone_number: string | null; sms_opt_in: boolean } | null }).profiles)
      .filter((p): p is { phone_number: string; sms_opt_in: boolean } => Boolean(p?.sms_opt_in && p?.phone_number));

    await Promise.all(recipients.map((p) => sendSms(p.phone_number, message)));
  } catch (err) {
    console.error("notifyOptedInMembers failed", err);
  }
}

/** Best-effort single-recipient notify — for events that concern one person, not the whole trip (join requests, decisions). */
export async function notifyUser(userId: string, message: string) {
  try {
    const supabase = await createClient();
    const { data: profile } = await supabase.from("profiles").select("phone_number, sms_opt_in").eq("id", userId).single();
    if (profile?.sms_opt_in && profile.phone_number) {
      await sendSms(profile.phone_number, message);
    }
  } catch (err) {
    console.error("notifyUser failed", err);
  }
}
