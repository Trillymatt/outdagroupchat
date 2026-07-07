"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps a list of rows for one trip in sync with Postgres changes.
 * Callers own optimistic inserts/updates via `setItems`; this hook merges in
 * whatever else changes (other members' edits, votes, deletes) so everyone
 * viewing the trip converges on the same state without a refresh.
 */
export function useRealtimeList<T extends { id: string }>(table: string, tripId: string, initial: T[]) {
  const [items, setItems] = useState<T[]>(initial);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`${table}-${tripId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table, filter: `trip_id=eq.${tripId}` },
        (payload) => {
          const row = payload.new as T;
          setItems((prev) => (prev.some((item) => item.id === row.id) ? prev : [...prev, row]));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table, filter: `trip_id=eq.${tripId}` },
        (payload) => {
          const row = payload.new as T;
          setItems((prev) => prev.map((item) => (item.id === row.id ? row : item)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table, filter: `trip_id=eq.${tripId}` },
        (payload) => {
          const row = payload.old as { id: string };
          setItems((prev) => prev.filter((item) => item.id !== row.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, tripId]);

  return [items, setItems] as const;
}

/** Tracks live UPDATEs to a single row, keyed by its primary key `id`. */
export function useRealtimeRow<T extends { id: string }>(table: string, id: string, initial: T) {
  const [row, setRow] = useState<T>(initial);

  useEffect(() => {
    setRow(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`${table}-row-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table, filter: `id=eq.${id}` }, (payload) => {
        setRow(payload.new as T);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, id]);

  return [row, setRow] as const;
}

/**
 * Same idea for join tables keyed by two ids (votes, per-member checks) that have
 * no single `id` column. `keyOf` extracts a stable composite key for dedupe/merge.
 */
export function useRealtimeJoinList<T>(table: string, tripId: string, initial: T[], keyOf: (row: T) => string) {
  const [items, setItems] = useState<T[]>(initial);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`${table}-${tripId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table, filter: `trip_id=eq.${tripId}` },
        (payload) => {
          const row = payload.new as T;
          setItems((prev) => (prev.some((item) => keyOf(item) === keyOf(row)) ? prev : [...prev, row]));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table, filter: `trip_id=eq.${tripId}` },
        (payload) => {
          const row = payload.new as T;
          setItems((prev) => prev.map((item) => (keyOf(item) === keyOf(row) ? row : item)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table, filter: `trip_id=eq.${tripId}` },
        (payload) => {
          const row = payload.old as T;
          setItems((prev) => prev.filter((item) => keyOf(item) !== keyOf(row)));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, tripId]);

  return [items, setItems] as const;
}
