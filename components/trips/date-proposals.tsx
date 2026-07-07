"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { notifyOptedInMembers } from "@/lib/actions/notify";
import { useRealtimeList, useRealtimeJoinList } from "@/lib/hooks/use-realtime-list";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDateRange } from "@/lib/utils/dates";

interface Proposal {
  id: string;
  trip_id: string;
  start_date: string;
  end_date: string;
  proposed_by: string;
  created_at: string;
}

interface Vote {
  proposal_id: string;
  user_id: string;
  trip_id: string;
  created_at: string;
}

export function DateProposals({
  tripId,
  currentUserId,
  initialProposals,
  initialVotes,
}: {
  tripId: string;
  currentUserId: string;
  initialProposals: Proposal[];
  initialVotes: Vote[];
}) {
  const [proposals] = useRealtimeList<Proposal>("trip_date_proposals", tripId, initialProposals);
  const [votes] = useRealtimeJoinList<Vote>("trip_date_votes", tripId, initialVotes, (v) => `${v.proposal_id}:${v.user_id}`);
  const [pending, startTransition] = useTransition();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  async function propose() {
    if (!start || !end) return;
    const supabase = createClient();
    await supabase.from("trip_date_proposals").insert({ trip_id: tripId, start_date: start, end_date: end, proposed_by: currentUserId });
    setStart("");
    setEnd("");
  }

  async function toggleVote(proposalId: string) {
    const supabase = createClient();
    const mine = votes.some((v) => v.proposal_id === proposalId && v.user_id === currentUserId);
    if (mine) {
      await supabase.from("trip_date_votes").delete().eq("proposal_id", proposalId).eq("user_id", currentUserId);
    } else {
      await supabase.from("trip_date_votes").insert({ proposal_id: proposalId, user_id: currentUserId, trip_id: tripId });
    }
  }

  async function lockIn(proposal: Proposal) {
    const supabase = createClient();
    await supabase
      .from("trips")
      .update({ start_date: proposal.start_date, end_date: proposal.end_date, dates_locked: true })
      .eq("id", tripId);
    await notifyOptedInMembers(tripId, `Dates are locked in: ${formatDateRange(proposal.start_date, proposal.end_date)}. Check Tandem for details.`);
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold text-ink">Propose dates</h2>
        <p className="text-sm text-ink-soft">No dates locked in yet — propose a range and vote as a group.</p>
      </div>

      <div className="space-y-2">
        {proposals.length === 0 && <p className="text-sm text-ink-soft">No proposals yet — be the first.</p>}
        {proposals.map((p) => {
          const count = votes.filter((v) => v.proposal_id === p.id).length;
          const votedByMe = votes.some((v) => v.proposal_id === p.id && v.user_id === currentUserId);
          return (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-paper px-3.5 py-2.5">
              <div>
                <p className="text-sm font-medium text-ink">{formatDateRange(p.start_date, p.end_date)}</p>
                <p className="text-xs text-ink-soft">
                  {count} vote{count === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={votedByMe ? "primary" : "secondary"}
                  onClick={() => startTransition(() => toggleVote(p.id))}
                  disabled={pending}
                >
                  {votedByMe ? "Voted" : "Vote"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => startTransition(() => lockIn(p))} disabled={pending}>
                  Use these dates
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 border-t border-line pt-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="proposal-start">Start</Label>
          <Input id="proposal-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="proposal-end">End</Label>
          <Input id="proposal-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <Button variant="secondary" className="w-full" onClick={() => startTransition(() => propose())} disabled={pending || !start || !end}>
        Propose these dates
      </Button>
    </Card>
  );
}
