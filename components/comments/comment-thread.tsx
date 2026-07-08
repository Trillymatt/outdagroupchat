"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar } from "@/components/ui/avatar";
import type { TripComment } from "@/lib/types/trip";

export function CommentThread({
  comments,
  currentUserId,
  memberLookup,
  onAdd,
  onDelete,
}: {
  comments: TripComment[];
  currentUserId: string;
  memberLookup: Map<string, { name: string; color?: string }>;
  onAdd: (body: string) => Promise<void>;
  onDelete: (commentId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onAdd(trimmed);
      setBody("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-t border-line pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg px-1 py-0.5 text-xs font-medium text-ink-soft transition-colors hover:text-ink"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        {comments.length > 0 ? `${comments.length} ${comments.length === 1 ? "comment" : "comments"}` : "Add a comment"}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 36 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-2">
              {comments.map((comment) => {
                const author = memberLookup.get(comment.created_by);
                return (
                  <div key={comment.id} className="group/comment flex items-start gap-2">
                    <Avatar name={author?.name ?? "?"} color={author?.color} size={20} />
                    <div className="min-w-0 flex-1 rounded-xl bg-ink/[0.04] px-2.5 py-1.5">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-xs font-semibold text-ink">{author?.name ?? "Someone"}</span>
                        <span className="text-[10px] text-ink-soft/70">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm text-ink-soft">{comment.body}</p>
                    </div>
                    {comment.created_by === currentUserId && (
                      <button
                        type="button"
                        onClick={() => onDelete(comment.id)}
                        className="mt-1 shrink-0 rounded-lg p-1 text-ink-soft/40 opacity-0 transition-opacity hover:bg-ink/5 hover:text-danger group-hover/comment:opacity-100"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Say something…"
                  maxLength={2000}
                  className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-green focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !body.trim()}
                  className="shrink-0 rounded-xl bg-sync-gradient p-2 text-white transition-opacity disabled:opacity-40"
                  aria-label="Send comment"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
