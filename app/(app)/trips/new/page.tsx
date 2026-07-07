import type { Metadata } from "next";
import { CreateTripForm } from "@/components/trips/create-trip-form";

export const metadata: Metadata = { title: "Create a trip — Tandem" };

export default function NewTripPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Start a new trip</h1>
        <p className="text-sm text-ink-soft">You'll get an invite code to share with everyone coming along.</p>
      </div>
      <CreateTripForm />
    </div>
  );
}
