"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/sms/client";

export type AccountFormState = { error?: string; success?: boolean } | undefined;

export async function updateAccountAction(_prevState: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const phone = String(formData.get("phone_number") ?? "").trim();
  const smsOptIn = formData.get("sms_opt_in") === "on";

  const { error } = await supabase
    .from("profiles")
    .update({ phone_number: phone || null, sms_opt_in: phone ? smsOptIn : false })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/account");
  return { success: true };
}

export async function sendTestSmsAction(): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase.from("profiles").select("name, phone_number, sms_opt_in").eq("id", user.id).single();
  if (!profile?.phone_number) return { error: "Add a phone number first." };
  if (!profile.sms_opt_in) return { error: "Turn on SMS notifications first." };

  try {
    await sendSms(profile.phone_number, `Hey ${profile.name.split(" ")[0]}, this is a test text from Tandem — SMS notifications are working.`);
    return { success: true };
  } catch {
    return { error: "Couldn't send the test text — double check your Twilio setup." };
  }
}
