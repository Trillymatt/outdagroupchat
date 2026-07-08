import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentsClient } from "@/components/documents/documents-client";

export const metadata: Metadata = { title: "Documents — Tandem" };

export default async function DocumentsPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: documents }, { data: members }] = await Promise.all([
    supabase.from("trip_documents").select("*").eq("trip_id", tripId).order("created_at", { ascending: false }),
    supabase.from("trip_members").select("user_id, display_name, role, profiles(name, avatar_color)").eq("trip_id", tripId),
  ]);

  const memberLookup = new Map(
    (members ?? []).map((m) => {
      const profile = (m as unknown as { profiles: { name: string; avatar_color: string } | null }).profiles;
      return [m.user_id, { name: profile?.name ?? m.display_name, color: profile?.avatar_color }];
    }),
  );

  const isOwner = (members ?? []).some((m) => m.user_id === user.id && m.role === "owner");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-sm text-ink-soft">Booking confirmations, tickets, and receipts — all in one place for travel day.</p>
      </div>
      <DocumentsClient
        tripId={tripId}
        currentUserId={user.id}
        isOwner={isOwner}
        initialDocuments={documents ?? []}
        memberLookup={memberLookup}
      />
    </div>
  );
}
