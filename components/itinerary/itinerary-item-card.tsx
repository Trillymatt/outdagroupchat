"use client";

import { forwardRef, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { GripVertical, Heart, MapPin, Pencil, Trash2, UtensilsCrossed, Car, Bed, Sparkles, Compass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { LinkPreview } from "@/components/ui/link-preview";
import { cn } from "@/lib/utils/cn";
import type { ItineraryItem } from "@/lib/types/trip";
import type { ItineraryCategory } from "@/lib/supabase/database.types";

const categoryMeta: Record<ItineraryCategory, { label: string; tone: "neutral" | "green" | "success" | "warning" | "danger"; icon: React.ReactNode }> = {
  activity: { label: "Activity", tone: "green", icon: <Compass className="h-3 w-3" /> },
  food: { label: "Food", tone: "warning", icon: <UtensilsCrossed className="h-3 w-3" /> },
  transport: { label: "Transport", tone: "neutral", icon: <Car className="h-3 w-3" /> },
  lodging: { label: "Lodging", tone: "success", icon: <Bed className="h-3 w-3" /> },
  other: { label: "Other", tone: "neutral", icon: <Sparkles className="h-3 w-3" /> },
};

function formatTime(time: string | null) {
  if (!time) return null;
  const [h, m] = time.split(":");
  const hour = Number(h);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${m} ${period}`;
}

export const ItineraryItemCard = forwardRef<
  HTMLDivElement,
  {
    item: ItineraryItem;
    authorName?: string;
    authorColor?: string;
    voteCount: number;
    votedByMe: boolean;
    voters: { name: string; color?: string }[];
    canEdit: boolean;
    onToggleVote: () => void;
    onEdit: () => void;
    onDelete: () => void;
    dragHandleProps?: Record<string, unknown>;
    style?: CSSProperties;
    isDragging?: boolean;
    commentSlot?: React.ReactNode;
  }
>(function ItineraryItemCard(
  { item, authorName, authorColor, voteCount, votedByMe, voters, canEdit, onToggleVote, onEdit, onDelete, dragHandleProps, style, isDragging, commentSlot },
  ref,
) {
  const meta = categoryMeta[item.category];
  const time = formatTime(item.time);

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      style={style}
      className={cn(
        "group flex items-start gap-2 rounded-2xl border border-line bg-paper px-3.5 py-3",
        isDragging && "shadow-[0_16px_32px_-16px_rgba(20,18,31,0.35)] ring-2 ring-green/40",
      )}
    >
      <button
        type="button"
        {...dragHandleProps}
        className="mt-0.5 shrink-0 cursor-grab touch-none rounded-lg p-1 text-ink-soft/50 hover:bg-ink/5 hover:text-ink-soft active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {time && <span className="text-xs font-semibold tabular-nums text-ink-soft">{time}</span>}
          <Badge tone={meta.tone}>
            {meta.icon}
            {meta.label}
          </Badge>
        </div>
        <p className="font-medium text-ink">{item.title}</p>
        {item.description && <p className="text-sm text-ink-soft">{item.description}</p>}
        {item.location && (
          <p className="flex items-center gap-1 text-xs text-ink-soft">
            <MapPin className="h-3 w-3" />
            {item.location}
          </p>
        )}
        {item.link && <LinkPreview url={item.link} variant="compact" />}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button size="sm" variant={votedByMe ? "primary" : "secondary"} onClick={onToggleVote}>
            <Heart className="h-3.5 w-3.5" />
            {voteCount}
          </Button>
          {voters.length > 0 && <AvatarStack members={voters} size={20} max={4} />}
          {authorName && (
            <span className="flex items-center gap-1.5 text-xs text-ink-soft">
              <Avatar name={authorName} color={authorColor} size={16} />
              Added by {authorName}
            </span>
          )}
          {item.cost != null && <span className="text-xs font-medium text-ink-soft">${item.cost.toFixed(2)}</span>}
        </div>
        {commentSlot}
      </div>

      {canEdit && (
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Button variant="ghost" size="sm" className="!px-2" onClick={onEdit} aria-label="Edit item">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="!px-2 text-danger hover:text-danger" onClick={onDelete} aria-label="Delete item">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </motion.div>
  );
});
