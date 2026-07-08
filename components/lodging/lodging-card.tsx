"use client";

import { motion } from "framer-motion";
import { Heart, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvatarStack } from "@/components/ui/avatar";
import { LinkPreview } from "@/components/ui/link-preview";
import { cn } from "@/lib/utils/cn";
import type { LodgingOption } from "@/lib/types/trip";

function money(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function LodgingCard({
  option,
  voteCount,
  votedByMe,
  voters,
  authorName,
  canEdit,
  memberCount,
  nights,
  onToggleVote,
  onToggleBooked,
  onDelete,
}: {
  option: LodgingOption;
  voteCount: number;
  votedByMe: boolean;
  voters: { name: string; color?: string }[];
  authorName?: string;
  canEdit: boolean;
  memberCount: number;
  nights: number | null;
  onToggleVote: () => void;
  onToggleBooked: () => void;
  onDelete: () => void;
}) {
  const booked = option.status === "booked";
  const pricePerNight = option.price_per_night;
  const total = pricePerNight != null && nights != null ? pricePerNight * nights : null;
  const splitAcross = memberCount > 1 ? memberCount : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      className={cn("group space-y-2 rounded-2xl border bg-paper p-4", booked ? "border-success/40" : "border-line")}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-ink">{option.name}</p>
            {booked && <Badge tone="success">Booked</Badge>}
          </div>
          {pricePerNight != null && (
            <p className="text-sm text-ink-soft">
              {money(pricePerNight)}/night
              {splitAcross && <span className="text-ink-soft/70"> · ≈{money(pricePerNight / splitAcross)}/person</span>}
            </p>
          )}
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={onDelete}
            className="shrink-0 rounded-lg p-1 text-ink-soft/40 opacity-0 transition-opacity hover:bg-ink/5 hover:text-danger group-hover:opacity-100"
            aria-label="Remove proposal"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {total != null && (
        <div className="flex items-center gap-1.5 rounded-xl bg-green/5 px-2.5 py-1.5 text-xs text-ink-soft">
          <Users className="h-3.5 w-3.5 shrink-0 text-green-dark" />
          <span>
            {money(total)} for {nights} {nights === 1 ? "night" : "nights"}
            {splitAcross && (
              <>
                {" "}
                · <span className="font-semibold text-green-dark">{money(total / splitAcross)}/person</span> split {splitAcross} ways
              </>
            )}
          </span>
        </div>
      )}

      {option.notes && <p className="text-sm text-ink-soft">{option.notes}</p>}

      {option.url && <LinkPreview url={option.url} fallbackLabel="View listing" />}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <Button size="sm" variant={votedByMe ? "primary" : "secondary"} onClick={onToggleVote}>
            <Heart className="h-3.5 w-3.5" />
            {voteCount}
          </Button>
          {voters.length > 0 && <AvatarStack members={voters} size={22} max={4} />}
        </div>
        <div className="flex items-center gap-2">
          {authorName && <span className="text-xs text-ink-soft">by {authorName}</span>}
          {canEdit && (
            <Button size="sm" variant="ghost" onClick={onToggleBooked}>
              {booked ? "Move back to proposed" : "Mark booked"}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
