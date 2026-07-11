import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountForm } from "@/components/account/account-form";
import { ProfilePictureCard } from "@/components/account/profile-picture-card";

export const metadata: Metadata = { title: "Account — Tandem" };

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account settings</h1>
        <p className="text-sm text-ink-soft">
          {profile.name} · {profile.email}
        </p>
      </div>
      <ProfilePictureCard userId={user.id} name={profile.name} color={profile.avatar_color} initialAvatarUrl={profile.avatar_url} />
      <AccountForm profile={profile} />
    </div>
  );
}
