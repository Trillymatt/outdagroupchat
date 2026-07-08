"use client";

import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeList } from "@/lib/hooks/use-realtime-list";
import type { TripComment } from "@/lib/types/trip";
import type { CommentEntityType } from "@/lib/supabase/database.types";

/**
 * One realtime subscription per page for all of a trip's comments, exposed as
 * per-entity slices (a lodging option, an itinerary item, a restaurant).
 */
export function useTripComments(tripId: string, currentUserId: string, initial: TripComment[]) {
  const [comments, setComments] = useRealtimeList<TripComment>("trip_comments", tripId, initial);

  const byEntity = useMemo(() => {
    const map = new Map<string, TripComment[]>();
    for (const c of comments) {
      const key = `${c.entity_type}:${c.entity_id}`;
      map.set(key, [...(map.get(key) ?? []), c]);
    }
    for (const list of map.values()) list.sort((a, b) => a.created_at.localeCompare(b.created_at));
    return map;
  }, [comments]);

  function commentsFor(entityType: CommentEntityType, entityId: string): TripComment[] {
    return byEntity.get(`${entityType}:${entityId}`) ?? [];
  }

  async function addComment(entityType: CommentEntityType, entityId: string, body: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("trip_comments")
      .insert({ trip_id: tripId, entity_type: entityType, entity_id: entityId, body, created_by: currentUserId })
      .select()
      .single();
    if (!error && data) {
      setComments((prev) => (prev.some((c) => c.id === data.id) ? prev : [...prev, data]));
    }
  }

  async function deleteComment(commentId: string) {
    const supabase = createClient();
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    await supabase.from("trip_comments").delete().eq("id", commentId);
  }

  return { commentsFor, addComment, deleteComment };
}
