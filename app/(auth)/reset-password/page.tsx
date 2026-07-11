import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password — Tandem" };

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The email link goes through /auth/confirm, which establishes a recovery
  // session before landing here. No session means the link expired, was
  // already used, or was opened in a different browser.
  if (!user) {
    return (
      <Card className="space-y-2 text-center">
        <p className="font-semibold text-ink">This reset link isn&apos;t valid anymore</p>
        <p className="text-sm text-ink-soft">
          It may have expired, already been used, or been opened in a different browser than the one that requested it.
        </p>
        <Link href="/forgot-password" className="mt-2 inline-block text-sm font-medium text-green-dark">
          Request a new reset link
        </Link>
      </Card>
    );
  }

  return <ResetPasswordForm />;
}
