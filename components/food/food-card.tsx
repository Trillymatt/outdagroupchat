"use client";

import { motion } from "framer-motion";
import { Heart, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvatarStack } from "@/components/ui/avatar";
import { LinkPreview } from "@/components/ui/link-preview";
import { CommentThread } from "@/components/comments/comment-thread";
import type { Restaurant } from "@/lib/types/trip";

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
}) {
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
            className="shrink-0 rounded-lg p-1 text-ink-soft/40 opacity-0 transition-opacity hover:bg-ink/5 hover:text-danger group-hover:opacity-100"
            aria-label="Remove recommendation"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {restaurant.notes && <p className="text-sm text-ink-soft">{restaurant.notes}</p>}

      {restaurant.url && <LinkPreview url={restaurant.url} variant="compact" />}

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
