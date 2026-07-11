"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeList } from "@/lib/hooks/use-realtime-list";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { formatDateRange } from "@/lib/utils/dates";
import type { TripLeg } from "@/lib/types/trip";

const emptyDraft = { city: "", start_date: "", end_date: "" };

export function TripLegsCard({ tripId, currentUserId, initialLegs }: { tripId: string; currentUserId: string; initialLegs: TripLeg[] }) {
  const [legs, setLegs] = useRealtimeList<TripLeg>("trip_legs", tripId, initialLegs);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  const sorted = useMemo(() => [...legs].sort((a, b) => a.start_date.localeCompare(b.start_date)), [legs]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.city.trim() || !draft.start_date || !draft.end_date) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("trip_legs")
      .insert({
        trip_id: tripId,
        city: draft.city.trim(),
        start_date: draft.start_date,
        end_date: draft.end_date,
        created_by: currentUserId,
      })
      .select()
      .single();
    if (!error && data) {
      setLegs((prev) => (prev.some((l) => l.id === data.id) ? prev : [...prev, data]));
      setDraft(emptyDraft);
      setAdding(false);
    }
  }

  async function handleDelete(legId: string) {
    if (!confirm("Remove this city from the trip? Its itinerary days go back to the unsorted list.")) return;
    const supabase = createClient();
    setLegs((prev) => prev.filter((l) => l.id !== legId));
    await supabase.from("trip_legs").delete().eq("id", legId);
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-ink">Cities</h2>
          <p className="text-xs text-ink-soft">Optional — split a multi-city trip into legs to group the itinerary by city.</p>
        </div>
        <Button size="sm" variant={adding ? "ghost" : "secondary"} onClick={() => setAdding((v) => !v)}>
          <Plus className="h-3.5 w-3.5" />
          {adding ? "Cancel" : "Add city"}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {adding && (
          <motion.form
            key="add-leg"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 36 }}
            onSubmit={handleAdd}
            className="space-y-3 overflow-hidden rounded-2xl border border-line bg-paper p-3.5"
          >
            <div>
              <Label htmlFor="leg-city">City</Label>
              <Input
                id="leg-city"
                placeholder="Rome, Italy"
                value={draft.city}
                onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="leg-start">Arrive</Label>
                <Input
                  id="leg-start"
                  type="date"
                  value={draft.start_date}
                  onChange={(e) => setDraft((d) => ({ ...d, start_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="leg-end">Leave</Label>
                <Input
                  id="leg-end"
                  type="date"
                  min={draft.start_date || undefined}
                  value={draft.end_date}
                  onChange={(e) => setDraft((d) => ({ ...d, end_date: e.target.value }))}
                />
              </div>
            </div>
            <Button type="submit" size="sm">
              Add
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      {sorted.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {sorted.map((leg) => (
              <motion.div
                key={leg.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                className="group flex items-center justify-between gap-2 rounded-2xl border border-line bg-paper px-3.5 py-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="h-4 w-4 shrink-0 text-green-dark" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{leg.city}</p>
                    <p className="text-xs text-ink-soft">{formatDateRange(leg.start_date, leg.end_date)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(leg.id)}
                  className="shrink-0 rounded-lg p-1 text-ink-soft/40 opacity-0 transition-opacity hover:bg-ink/5 hover:text-danger group-hover:opacity-100"
                  aria-label={`Remove ${leg.city}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );
}
