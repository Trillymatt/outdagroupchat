import type { Metadata } from "next";
import { JoinTripForm } from "@/components/trips/join-trip-form";

export const metadata: Metadata = { title: "Join a trip — Tandem" };

export default async function JoinTripPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Join a trip</h1>
        <p className="text-sm text-ink-soft">Enter the invite code someone in the group chat shared with you.</p>
      </div>
      <JoinTripForm defaultCode={code} />
    </div>
  );
}
