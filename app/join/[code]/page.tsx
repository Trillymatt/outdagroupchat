import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requestToJoinByCode } from "@/lib/actions/trips";
import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/ui/logo";

export const metadata: Metadata = { title: "Join a trip — Tandem" };

export default async function JoinByLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const inviteCode = decodeURIComponent(code).trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The middleware already bounces logged-out visitors to /login with this
  // destination preserved, but guard here too in case it's ever bypassed.
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/join/${inviteCode}`)}`);
  }

  const result = await requestToJoinByCode(inviteCode);
  if ("alreadyMember" in result && result.alreadyMember) {
    redirect(`/trips/${result.tripId}/overview`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-16">
      <div className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink">
        <LogoMark size={32} />
        Tandem
      </div>
      {"tripName" in result ? (
        <Card className="mt-8 w-full max-w-sm space-y-3 text-center">
          <p className="font-semibold text-ink">Request sent</p>
          <p className="text-sm text-ink-soft">
            You&apos;ll get access to <span className="font-medium text-ink">{result.tripName}</span> once the owner approves your
            request.
          </p>
          <p className="text-sm text-ink-soft">
            <Link href="/dashboard" className="font-medium text-green-dark">
              Go to your dashboard
            </Link>
          </p>
        </Card>
      ) : (
        <Card className="mt-8 w-full max-w-sm space-y-3 text-center">
          <p className="font-semibold text-ink">This invite link didn&apos;t work</p>
          <p className="text-sm text-ink-soft">
            The code <span className="font-mono uppercase tracking-widest">{inviteCode}</span> doesn&apos;t match a trip.
            It may have been mistyped, or the trip may no longer exist.
          </p>
          <p className="text-sm text-ink-soft">
            <Link href="/trips/join" className="font-medium text-green-dark">
              Enter an invite code manually
            </Link>{" "}
            or{" "}
            <Link href="/dashboard" className="font-medium text-green-dark">
              go to your dashboard
            </Link>
            .
          </p>
        </Card>
      )}
    </div>
  );
}
