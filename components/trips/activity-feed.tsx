"use client";

import { formatDistanceToNow } from "date-fns";
import { Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useRealtimeList } from "@/lib/hooks/use-realtime-list";
import type { ActivityEvent } from "@/lib/types/trip";

export function ActivityFeed({ tripId, initialEvents }: { tripId: string; initialEvents: ActivityEvent[] }) {
  const [events] = useRealtimeList<ActivityEvent>("activity_events", tripId, initialEvents);
  const sorted = [...events].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20);

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-green-dark" />
        <h2 className="font-semibold text-ink">Activity</h2>
      </div>
      {sorted.length === 0 ? (
        <EmptyState title="Nothing yet" description="Changes to the trip — new members, permissions, plans — show up here." />
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {sorted.map((e) => (
            <div key={e.id} className="rounded-xl border border-line bg-paper px-3 py-2 text-sm">
              <p className="text-ink">{e.summary}</p>
              <p className="text-xs text-ink-soft">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
