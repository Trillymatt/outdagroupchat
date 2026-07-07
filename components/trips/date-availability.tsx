"use client";

import { useMemo } from "react";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeJoinList } from "@/lib/hooks/use-realtime-list";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvatarStack } from "@/components/ui/avatar";

interface AvailabilityRow {
  trip_id: string;
  user_id: string;
  date: string;
  created_at: string;
}

export function DateAvailability({
  tripId,
  currentUserId,
  initialAvailability,
  members,
  windowStart,
  windowEnd,
}: {
  tripId: string;
  currentUserId: string;
  initialAvailability: AvailabilityRow[];
  members: { userId: string; name: string; color?: string }[];
  windowStart: string;
  windowEnd: string;
}) {
  const [availability, setAvailability] = useRealtimeJoinList<AvailabilityRow>(
    "trip_date_availability",
    tripId,
    initialAvailability,
    (a) => `${a.date}:${a.user_id}`,
  );

  const days = useMemo(
    () => eachDayOfInterval({ start: parseISO(windowStart), end: parseISO(windowEnd) }).map((d) => format(d, "yyyy-MM-dd")),
    [windowStart, windowEnd],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, AvailabilityRow[]>();
    for (const a of availability) map.set(a.date, [...(map.get(a.date) ?? []), a]);
    return map;
  }, [availability]);

  async function toggleDay(date: string) {
    const supabase = createClient();
    const mine = availability.some((a) => a.date === date && a.user_id === currentUserId);
    if (mine) {
      setAvailability((prev) => prev.filter((a) => !(a.date === date && a.user_id === currentUserId)));
      await supabase.from("trip_date_availability").delete().eq("date", date).eq("user_id", currentUserId);
    } else {
      setAvailability((prev) => [...prev, { trip_id: tripId, user_id: currentUserId, date, created_at: new Date().toISOString() }]);
      await supabase.from("trip_date_availability").insert({ trip_id: tripId, user_id: currentUserId, date });
    }
  }

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-semibold text-ink">Who's free when</h2>
        <p className="text-sm text-ink-soft">Mark the days you're free — the group can see where everyone overlaps.</p>
      </div>
      <div className="max-h-96 space-y-1.5 overflow-y-auto">
        {days.map((day) => {
          const dayVotes = byDate.get(day) ?? [];
          const mine = dayVotes.some((a) => a.user_id === currentUserId);
          const pct = members.length > 0 ? dayVotes.length / members.length : 0;
          return (
            <div
              key={day}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line px-3.5 py-2"
              style={{ backgroundColor: pct > 0 ? `rgba(31, 95, 66, ${0.06 + pct * 0.24})` : undefined }}
            >
              <div>
                <p className="text-sm font-medium text-ink">{format(parseISO(day), "EEE, MMM d")}</p>
                <p className="text-xs text-ink-soft">
                  {dayVotes.length}/{members.length} free
                </p>
              </div>
              <div className="flex items-center gap-2">
                {dayVotes.length > 0 && (
                  <AvatarStack members={dayVotes.map((a) => members.find((m) => m.userId === a.user_id) ?? { name: "Someone" })} size={20} max={4} />
                )}
                <Button size="sm" variant={mine ? "primary" : "secondary"} onClick={() => toggleDay(day)}>
                  {mine ? "I'm free" : "Mark free"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
