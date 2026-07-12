"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { normalizeSiteOrigin } from "@/lib/utils/site-url";

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
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // If email confirmation is on, the confirmation link signs them in and
      // lands them on their original destination (e.g. an invite link).
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(redirectTo ?? "/dashboard")}`,
      data: {
        name,
        phone_number: phone || null,
        sms_opt_in: phone ? smsOptIn : false,
      },
    },
  });

  if (error) return { error: error.message };
  if (!data.session) {
    return {
      message: redirectTo?.startsWith("/join/")
        ? "Check your email to confirm your account — the confirmation link will take you straight to your trip invite."
        : "Check your email to confirm your account, then log in.",
    };
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

async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return normalizeSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return normalizeSiteOrigin(`${proto}://${host}`);
}

export async function requestPasswordResetAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email address." };

  const supabase = await createClient();
  const origin = await siteOrigin();
  // The email link lands on /auth/confirm, which exchanges the recovery token
  // for a session and forwards to /reset-password.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });

  // Always report success so the form can't be used to probe which emails exist.
  return { message: "If that email has an account, we sent a reset link. Check your inbox." };
}

export async function updatePasswordAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords don't match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your reset link has expired. Request a new one below." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/dashboard");
}
