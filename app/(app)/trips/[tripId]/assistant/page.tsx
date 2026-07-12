import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssistantClient } from "@/components/assistant/assistant-client";

export const metadata: Metadata = { title: "Assistant — Tandem" };

export default async function AssistantPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: suggestions }, { data: packingItems }, { data: packingChecks }] = await Promise.all([
    supabase.from("ai_suggestions").select("*").eq("trip_id", tripId).order("created_at", { ascending: true }),
    supabase.from("packing_items").select("*").eq("trip_id", tripId).order("created_at", { ascending: true }),
    supabase.from("packing_item_checks").select("*").eq("trip_id", tripId),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assistant</h1>
        <p className="text-sm text-ink-soft">Optional helpers for planning faster. Open only what you need.</p>
      </div>
      <AssistantClient
        tripId={tripId}
        currentUserId={user.id}
        initialSuggestions={suggestions ?? []}
        initialPackingItems={packingItems ?? []}
        initialPackingChecks={packingChecks ?? []}
      />
    </div>
  );
}
