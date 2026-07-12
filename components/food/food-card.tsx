"use client";

import { motion } from "framer-motion";
import { CalendarPlus, ExternalLink, Heart, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvatarStack } from "@/components/ui/avatar";
import { LinkPreview } from "@/components/ui/link-preview";
import { CommentThread } from "@/components/comments/comment-thread";
import type { Restaurant } from "@/lib/types/trip";
import { Input, Label, Select } from "@/components/ui/input";
import { formatDay } from "@/lib/utils/dates";
import { appleMapsSearchUrl } from "@/lib/utils/maps";

export function FoodCard({
  restaurant,
  tripId,
  currentUserId,
  authorsById,
  voteCount,
  votedByMe,
  voters,
  authorName,
  canEdit,
  onToggleVote,
  onDelete,
  days,
  onSchedule,
  destination,
}: {
  restaurant: Restaurant;
  tripId: string;
  currentUserId: string;
  authorsById: Map<string, { name: string; color?: string }>;
  voteCount: number;
  votedByMe: boolean;
  voters: { name: string; color?: string }[];
  authorName?: string;
  canEdit: boolean;
  onToggleVote: () => void;
  onDelete: () => void;
  days: string[];
  onSchedule: (day: string, time: string) => Promise<boolean>;
  destination?: string | null;
}) {
  const [scheduling, setScheduling] = useState(false);
  const [day, setDay] = useState(days[0] ?? new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [scheduled, setScheduled] = useState(false);

  async function schedule() {
    setSaving(true);
    const ok = await onSchedule(day, time);
    setSaving(false);
    if (ok) {
      setScheduled(true);
      setScheduling(false);
    }
  }

  const appleMapsUrl = appleMapsSearchUrl(restaurant.name, destination);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      className="group space-y-2 rounded-2xl border border-line bg-paper p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-ink">{restaurant.name}</p>
          {restaurant.cuisine && <Badge tone="green">{restaurant.cuisine}</Badge>}
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={onDelete}
            className="shrink-0 rounded-lg p-2 text-ink-soft/60 transition-colors hover:bg-ink/5 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
            aria-label="Remove recommendation"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {restaurant.notes && <p className="text-sm text-ink-soft">{restaurant.notes}</p>}

      {restaurant.url && <LinkPreview url={restaurant.url} variant="compact" />}

      <div className="flex flex-wrap gap-2">
        <a
          href={appleMapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-medium text-ink hover:border-green/60 sm:min-h-9"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Apple Maps
        </a>
        <Button size="sm" variant="secondary" onClick={() => setScheduling((current) => !current)}>
          <CalendarPlus className="h-3.5 w-3.5" />
          {scheduling ? "Cancel" : "Plan for a day"}
        </Button>
      </div>

      {scheduling && (
        <div className="grid gap-2 rounded-2xl border border-dashed border-green/40 bg-green/5 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div>
            <Label htmlFor={`restaurant-day-${restaurant.id}`}>Day</Label>
            <Select id={`restaurant-day-${restaurant.id}`} value={day} onChange={(event) => setDay(event.target.value)}>
              {days.map((option) => <option key={option} value={option}>{formatDay(option)}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor={`restaurant-time-${restaurant.id}`}>Time</Label>
            <Input id={`restaurant-time-${restaurant.id}`} type="time" value={time} onChange={(event) => setTime(event.target.value)} />
          </div>
          <Button size="sm" onClick={schedule} disabled={saving}>{saving ? "Adding…" : "Add"}</Button>
        </div>
      )}
      {scheduled && <p className="text-xs font-medium text-success">Added to {formatDay(day)}.</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <Button size="sm" variant={votedByMe ? "primary" : "secondary"} onClick={onToggleVote}>
            <Heart className="h-3.5 w-3.5" />
            {voteCount}
          </Button>
          {voters.length > 0 && <AvatarStack members={voters} size={22} max={4} />}
        </div>
        {authorName && <span className="text-xs text-ink-soft">added by {authorName}</span>}
      </div>

      <CommentThread
        tripId={tripId}
        targetType="restaurant"
        targetId={restaurant.id}
        currentUserId={currentUserId}
        authorsById={authorsById}
      />
    </motion.div>
  );
}
