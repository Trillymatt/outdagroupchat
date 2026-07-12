import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requestToJoinByCode } from "@/lib/actions/trips";
import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/ui/logo";
import { RouteBackdrop } from "@/components/ui/route-line";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata: Metadata = {
  title: "You’re invited to plan a trip — Tandem",
  description: "Bring the plans out of the group chat — together in Tandem. Sign in or create an account to join the trip.",
  openGraph: {
    type: "website",
    siteName: "Tandem",
    title: "You’re invited to plan a trip",
    description: "Bring the plans out of the group chat — together in Tandem.",
    images: [{ url: "/og-invite.png", width: 1200, height: 630, alt: "You’re invited to plan a trip in Tandem" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "You’re invited to plan a trip",
    description: "Bring the plans out of the group chat — together in Tandem.",
    images: ["/og-invite.png"],
  },
};

export default async function JoinByLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const inviteCode = decodeURIComponent(code).trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const destination = `/join/${inviteCode}`;
    const loginHref = `/login?redirect=${encodeURIComponent(destination)}`;
    const signupHref = `/signup?redirect=${encodeURIComponent(destination)}`;

    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-paper px-4 py-12 sm:py-16">
        <ThemeToggle className="absolute right-4 top-4 z-10" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-40">
          <RouteBackdrop className="h-full w-full" />
        </div>
        <div className="relative flex items-center gap-2 text-lg font-semibold tracking-tight text-ink">
          <LogoMark size={32} />
          Tandem
        </div>
        <Card className="relative z-10 mt-6 w-full max-w-sm space-y-5 text-center sm:mt-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-dark">Trip invitation</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">You’re invited to plan a trip</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Bring the plans out of the group chat — together in Tandem.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-paper px-3.5 py-3">
            <p className="text-xs text-ink-soft">Invite code</p>
            <p className="mt-1 font-mono text-base font-semibold tracking-[0.24em] text-ink">{inviteCode}</p>
          </div>
          <div className="space-y-2.5">
            <Link
              href={signupHref}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-sync-gradient px-4 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(31,95,66,0.5)]"
            >
              Create an account to join
            </Link>
            <Link
              href={loginHref}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-green/60"
            >
              Sign in to join
            </Link>
          </div>
          <p className="text-xs leading-relaxed text-ink-soft">Your invitation stays attached while you sign in or create your account.</p>
        </Card>
      </div>
    );
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
