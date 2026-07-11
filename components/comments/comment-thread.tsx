"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import type { TripComment } from "@/lib/types/trip";
import type { CommentTargetType } from "@/lib/supabase/database.types";

function shortTime(iso: string) {
  const diffMins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m`;
  const hours = Math.floor(diffMins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Collapsible comment thread for one votable option (lodging / restaurant /
 * itinerary item). Shows only a quiet trigger row until expanded; comments are
 * fetched on first expand and kept live via a per-target realtime subscription
 * while the thread is open. A lightweight head-only count query on mount keeps
 * the collapsed label ("3 comments" vs "Add a comment") accurate without
 * loading comment bodies up front.
 */
export function CommentThread({
  tripId,
  targetType,
  targetId,
  currentUserId,
  authorsById,
}: {
  tripId: string;
  targetType: CommentTargetType;
  targetId: string;
  currentUserId: string;
  authorsById: Map<string, { name: string; color?: string }>;
}) {
  const [open, setOpen] = useState(false);
  // null = not loaded yet (collapsed label falls back to the count query below).
  const [comments, setComments] = useState<TripComment[] | null>(null);
  const [count, setCount] = useState(0);
  const [draft, setDraft] = useState("");
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .then(({ count: c }) => {
        if (!cancelled && c != null) setCount(c);
      });
    return () => {
      cancelled = true;
    };
  }, [targetType, targetId]);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    let cancelled = false;

    if (!loadedRef.current) {
      loadedRef.current = true;
      supabase
        .from("comments")
        .select("*")
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .order("created_at", { ascending: true })
        .then(({ data, error }) => {
          if (cancelled) return;
          if (error) loadedRef.current = false;
          else setComments((prev) => (prev === null ? (data ?? []) : prev));
        });
    }

    const channel = supabase
      .channel(`comments-${targetType}-${targetId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `target_id=eq.${targetId}` },
        (payload) => {
          const row = payload.new as TripComment;
          if (row.target_type !== targetType) return;
          setComments((prev) => (prev === null || prev.some((c) => c.id === row.id) ? prev : [...prev, row]));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "comments", filter: `target_id=eq.${targetId}` },
        (payload) => {
          const row = payload.old as { id: string };
          setComments((prev) => (prev === null ? prev : prev.filter((c) => c.id !== row.id)));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [open, targetType, targetId]);

  const displayCount = comments !== null ? comments.length : count;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;

    const tempId = `temp-${crypto.randomUUID()}`;
    const optimistic: TripComment = {
      id: tempId,
      trip_id: tripId,
      user_id: currentUserId,
      target_type: targetType,
      target_id: targetId,
      body,
      created_at: new Date().toISOString(),
    };
    setComments((prev) => [...(prev ?? []), optimistic]);
    setDraft("");

    const supabase = createClient();
    const { data, error } = await supabase
      .from("comments")
      .insert({ trip_id: tripId, user_id: currentUserId, target_type: targetType, target_id: targetId, body })
      .select()
      .single();

    if (error || !data) {
      // Roll back the optimistic row and restore the draft so nothing is lost.
      setComments((prev) => (prev === null ? prev : prev.filter((c) => c.id !== tempId)));
      setDraft(body);
      return;
    }
    setComments((prev) => {
      if (prev === null) return prev;
      const withoutTemp = prev.filter((c) => c.id !== tempId);
      return withoutTemp.some((c) => c.id === data.id) ? withoutTemp : [...withoutTemp, data];
    });
  }

  async function handleDelete(id: string) {
    setComments((prev) => (prev === null ? prev : prev.filter((c) => c.id !== id)));
    await createClient().from("comments").delete().eq("id", id);
  }

  return (
    // stopPropagation keeps pointer/key events inside the thread (typing,
    // clicking, selecting text) from ever reaching dnd-kit sortable wrappers.
    <div onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-ink-soft/70 transition-colors hover:text-ink"
        aria-expanded={open}
      >
        <MessageCircle className="h-3.5 w-3.5" />
        {displayCount > 0 ? `${displayCount} comment${displayCount === 1 ? "" : "s"}` : "Add a comment"}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="thread"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 36 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2.5 border-t border-line pt-2.5">
              {comments === null ? (
                <p className="text-xs text-ink-soft">Loading comments…</p>
              ) : (
                comments.map((comment) => {
                  const author = authorsById.get(comment.user_id);
                  const name = author?.name ?? "Someone";
                  return (
                    <div key={comment.id} className="group/comment flex items-start gap-2">
                      <Avatar name={name} color={author?.color} size={20} className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-ink-soft">
                          <span className="font-medium text-ink">{name}</span>{" "}
                          <span className="text-ink-soft/60">{shortTime(comment.created_at)}</span>
                        </p>
                        <p className="whitespace-pre-wrap break-words text-sm text-ink">{comment.body}</p>
                      </div>
                      {comment.user_id === currentUserId && (
                        <button
                          type="button"
                          onClick={() => handleDelete(comment.id)}
                          className="shrink-0 rounded-lg p-1 text-ink-soft/40 opacity-0 transition-opacity hover:bg-ink/5 hover:text-danger group-hover/comment:opacity-100 focus-visible:opacity-100"
                          aria-label="Delete comment"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}

              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a comment…"
                  maxLength={2000}
                  className="min-w-0 flex-1 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-soft/60 outline-none transition-shadow focus:border-green focus:ring-4 focus:ring-green/15"
                />
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="shrink-0 rounded-full px-2.5 py-1.5 text-xs font-medium text-green-dark transition-colors hover:bg-green/10 disabled:pointer-events-none disabled:opacity-40"
                >
                  Post
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
