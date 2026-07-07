"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = { error?: string; message?: string } | undefined;

// Only follow same-origin relative paths (e.g. "/trips/join?code=X") — rejects
// protocol-relative ("//evil.com") or backslash-tricked values to avoid an
// open redirect via the `redirect` form field.
function safeRedirect(value: FormDataEntryValue | null): string | null {
  const path = String(value ?? "").trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return null;
  return path;
}

export async function signUpAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const phone = String(formData.get("phone_number") ?? "").trim();
  const smsOptIn = formData.get("sms_opt_in") === "on";
  const redirectTo = safeRedirect(formData.get("redirect"));

  if (!name || !email || !password) {
    return { error: "Name, email, and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        phone_number: phone || null,
        sms_opt_in: phone ? smsOptIn : false,
      },
    },
  });

  if (error) return { error: error.message };
  if (!data.session) {
    return { message: "Check your email to confirm your account, then log in." };
  }
  redirect(redirectTo ?? "/dashboard");
}

export async function signInAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirect(formData.get("redirect"));

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Incorrect email or password." };
  redirect(redirectTo ?? "/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
