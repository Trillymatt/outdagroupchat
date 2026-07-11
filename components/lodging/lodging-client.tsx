"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeList, useRealtimeJoinList } from "@/lib/hooks/use-realtime-list";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LodgingCard } from "@/components/lodging/lodging-card";
import { LodgingForm, type LodgingFormValues } from "@/components/lodging/lodging-form";
import type { LodgingOption } from "@/lib/types/trip";

interface LodgingVoteRow {
  lodging_option_id: string;
  user_id: string;
  trip_id: string;
  created_at: string;
}

export function LodgingClient({
  tripId,
  currentUserId,
  canEditOthers,
  initialOptions,
  initialVotes,
  memberLookup,
  memberCount,
  nights,
}: {
  tripId: string;
  currentUserId: string;
  canEditOthers: boolean;
  initialOptions: LodgingOption[];
  initialVotes: LodgingVoteRow[];
  memberLookup: Map<string, { name: string; color?: string }>;
  memberCount: number;
  nights: number | null;
}) {
  const [options, setOptions] = useRealtimeList<LodgingOption>("lodging_options", tripId, initialOptions);
  const [votes, setVotes] = useRealtimeJoinList<LodgingVoteRow>(
    "lodging_votes",
    tripId,
    initialVotes,
    (v) => `${v.lodging_option_id}:${v.user_id}`,
  );
  const [adding, setAdding] = useState(false);

  const votesByOption = useMemo(() => {
    const map = new Map<string, LodgingVoteRow[]>();
    for (const v of votes) map.set(v.lodging_option_id, [...(map.get(v.lodging_option_id) ?? []), v]);
    return map;
  }, [votes]);

  const booked = useMemo(() => options.filter((o) => o.status === "booked"), [options]);
  const proposed = useMemo(
    () =>
      options
        .filter((o) => o.status === "proposed")
        .sort((a, b) => (votesByOption.get(b.id)?.length ?? 0) - (votesByOption.get(a.id)?.length ?? 0)),
    [options, votesByOption],
  );

  async function handleAdd(values: LodgingFormValues) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("lodging_options")
      .insert({
        trip_id: tripId,
        name: values.name.trim(),
        url: values.url.trim() || null,
        price_per_night: values.price_per_night ? Number(values.price_per_night) : null,
        notes: values.notes.trim() || null,
        confirmation_number: values.confirmation_number.trim() || null,
        booking_url: values.booking_url.trim() || null,
        booking_notes: values.booking_notes.trim() || null,
        created_by: currentUserId,
      })
      .select()
      .single();

    if (!error && data) {
      setOptions((prev) => (prev.some((o) => o.id === data.id) ? prev : [...prev, data]));
      setAdding(false);
    }
  }

  async function toggleVote(optionId: string) {
    const supabase = createClient();
    const mine = votes.some((v) => v.lodging_option_id === optionId && v.user_id === currentUserId);
    if (mine) {
      setVotes((prev) => prev.filter((v) => !(v.lodging_option_id === optionId && v.user_id === currentUserId)));
      await supabase.from("lodging_votes").delete().eq("lodging_option_id", optionId).eq("user_id", currentUserId);
    } else {
      setVotes((prev) => [...prev, { lodging_option_id: optionId, user_id: currentUserId, trip_id: tripId, created_at: new Date().toISOString() }]);
      await supabase.from("lodging_votes").insert({ lodging_option_id: optionId, user_id: currentUserId, trip_id: tripId });
    }
  }

  async function toggleBooked(option: LodgingOption) {
    const supabase = createClient();
    const nextStatus = option.status === "booked" ? "proposed" : "booked";
    setOptions((prev) => prev.map((o) => (o.id === option.id ? { ...o, status: nextStatus } : o)));
    await supabase.from("lodging_options").update({ status: nextStatus }).eq("id", option.id);
  }

  async function handleDelete(optionId: string) {
    if (!confirm("Remove this lodging option?")) return;
    const supabase = createClient();
    setOptions((prev) => prev.filter((o) => o.id !== optionId));
    await supabase.from("lodging_options").delete().eq("id", optionId);
  }

  function renderCard(option: LodgingOption) {
    const optionVotes = votesByOption.get(option.id) ?? [];
    return (
      <LodgingCard
        key={option.id}
        option={option}
        tripId={tripId}
        currentUserId={currentUserId}
        authorsById={memberLookup}
        voteCount={optionVotes.length}
        votedByMe={optionVotes.some((v) => v.user_id === currentUserId)}
        voters={optionVotes.map((v) => memberLookup.get(v.user_id) ?? { name: "Someone" })}
        authorName={memberLookup.get(option.created_by)?.name}
        canEdit={option.created_by === currentUserId || canEditOthers}
        memberCount={memberCount}
        nights={nights}
        onToggleVote={() => toggleVote(option.id)}
        onToggleBooked={() => toggleBooked(option)}
        onDelete={() => handleDelete(option.id)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">Propose a place to stay</h2>
          <Button size="sm" variant={adding ? "ghost" : "primary"} onClick={() => setAdding((v) => !v)}>
            <Plus className="h-3.5 w-3.5" />
            {adding ? "Cancel" : "Add option"}
          </Button>
        </div>
        <AnimatePresence initial={false}>
          {adding && <LodgingForm key="add-form" onCancel={() => setAdding(false)} onSubmit={handleAdd} />}
        </AnimatePresence>
      </Card>

      {booked.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Booked</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <AnimatePresence initial={false}>{booked.map(renderCard)}</AnimatePresence>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Proposed</h3>
        {proposed.length === 0 && options.length === 0 ? (
          <EmptyState title="No lodging options yet" description="Paste a link to a place you're considering to get the group voting." />
        ) : proposed.length === 0 ? (
          <p className="text-sm text-ink-soft">Everything proposed so far is booked.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <AnimatePresence initial={false}>{proposed.map(renderCard)}</AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
