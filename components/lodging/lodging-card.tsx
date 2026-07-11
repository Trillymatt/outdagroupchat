"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, ExternalLink, Heart, MapPin, Pencil, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvatarStack } from "@/components/ui/avatar";
import { LinkPreview } from "@/components/ui/link-preview";
import { CommentThread } from "@/components/comments/comment-thread";
import { FindFoodNearbyButton } from "@/components/trips/find-food-nearby-button";
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
  tripId,
  currentUserId,
  authorsById,
  voteCount,
  votedByMe,
  voters,
  authorName,
  canEdit,
  memberCount,
  nights,
  onToggleVote,
  onToggleBooked,
  onEdit,
  onDelete,
}: {
  option: LodgingOption;
  tripId: string;
  currentUserId: string;
  authorsById: Map<string, { name: string; color?: string }>;
  voteCount: number;
  votedByMe: boolean;
  voters: { name: string; color?: string }[];
  authorName?: string;
  canEdit: boolean;
  memberCount: number;
  nights: number | null;
  onToggleVote: () => void;
  onToggleBooked: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const booked = option.status === "booked";
  const pricePerNight = option.price_per_night;
  const total = pricePerNight != null && nights != null ? pricePerNight * nights : null;
  const splitAcross = memberCount > 1 ? memberCount : null;
  const [copied, setCopied] = useState(false);
  const hasBookingDetails = Boolean(option.confirmation_number || option.booking_url || option.booking_notes);

  async function copyConfirmation() {
    if (!option.confirmation_number) return;
    await navigator.clipboard.writeText(option.confirmation_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

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
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg p-1 text-ink-soft/40 hover:bg-ink/5 hover:text-ink"
              aria-label="Edit proposal"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg p-1 text-ink-soft/40 hover:bg-ink/5 hover:text-danger"
              aria-label="Remove proposal"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
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

      {option.location && (
        <p className="flex items-center gap-1 text-xs text-ink-soft">
          <MapPin className="h-3 w-3" />
          {option.location}
        </p>
      )}
      {option.lat != null && option.lng != null && (
        <FindFoodNearbyButton tripId={tripId} lat={option.lat} lng={option.lng} label={option.name} />
      )}

      {option.url && <LinkPreview url={option.url} fallbackLabel="View listing" />}

      {hasBookingDetails && (
        <div className="space-y-1.5 rounded-xl border border-success/30 bg-success/5 p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Booking details</p>
          {option.confirmation_number && (
            <button
              type="button"
              onClick={copyConfirmation}
              className="inline-flex items-center gap-1.5 text-sm text-ink transition-colors hover:text-green-dark"
              title="Copy confirmation number"
            >
              <span className="font-mono">{option.confirmation_number}</span>
              {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3 text-ink-soft/60" />}
            </button>
          )}
          {option.booking_url && (
            <a
              href={option.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-green-dark hover:underline"
            >
              View booking <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {option.booking_notes && <p className="text-sm text-ink-soft">{option.booking_notes}</p>}
        </div>
      )}

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

      <CommentThread
        tripId={tripId}
        targetType="lodging"
        targetId={option.id}
        currentUserId={currentUserId}
        authorsById={authorsById}
      />
    </motion.div>
  );
}
