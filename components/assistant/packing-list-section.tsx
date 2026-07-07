"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { createClient } from "@/lib/supabase/client";
import { AiSectionCard } from "./ai-section-card";
import type { PackingItem } from "@/lib/types/trip";
import type { PackingCheckRow } from "./assistant-client";

export function PackingListSection({
  tripId,
  currentUserId,
  packingItems,
  setPackingItems,
  packingChecks,
  setPackingChecks,
}: {
  tripId: string;
  currentUserId: string;
  packingItems: PackingItem[];
  setPackingItems: Dispatch<SetStateAction<PackingItem[]>>;
  packingChecks: PackingCheckRow[];
  setPackingChecks: Dispatch<SetStateAction<PackingCheckRow[]>>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tripType, setTripType] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const byCategory = new Map<string, PackingItem[]>();
    for (const item of packingItems) {
      const key = item.category ?? "Other";
      byCategory.set(key, [...(byCategory.get(key) ?? []), item]);
    }
    return [...byCategory.entries()];
  }, [packingItems]);

  const checkedByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of packingChecks) {
      if (!c.checked) continue;
      map.set(c.packing_item_id, (map.get(c.packing_item_id) ?? 0) + 1);
    }
    return map;
  }, [packingChecks]);

  const myChecks = useMemo(
    () => new Set(packingChecks.filter((c) => c.user_id === currentUserId && c.checked).map((c) => c.packing_item_id)),
    [packingChecks, currentUserId],
  );

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/packing-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      if (data.items?.length > 0) {
        setPackingItems((prev) => [...prev, ...data.items]);
        setTripType(data.tripType ?? null);
      } else {
        setError("Couldn't generate a list — try adding a destination and dates first.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function toggle(itemId: string) {
    const isChecked = myChecks.has(itemId);
    setPackingChecks((prev) => {
      const existing = prev.find((c) => c.packing_item_id === itemId && c.user_id === currentUserId);
      if (existing) return prev.map((c) => (c === existing ? { ...c, checked: !isChecked } : c));
      return [...prev, { packing_item_id: itemId, user_id: currentUserId, trip_id: tripId, checked: true }];
    });
    const supabase = createClient();
    await supabase
      .from("packing_item_checks")
      .upsert({ packing_item_id: itemId, user_id: currentUserId, trip_id: tripId, checked: !isChecked }, { onConflict: "packing_item_id,user_id" });
  }

  return (
    <AiSectionCard
      title="Packing list"
      description="Generated from your destination, dates, and itinerary — everyone checks off their own copy."
      actionLabel={packingItems.length > 0 ? "Regenerate" : "Generate packing list"}
      onGenerate={generate}
      loading={loading}
      error={error}
    >
      {tripType && <p className="text-xs text-ink-soft">Looks like a {tripType} trip.</p>}
      {grouped.length === 0 && <p className="text-sm text-ink-soft">No packing list yet.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {grouped.map(([category, items]) => (
          <div key={category}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">{category}</p>
            <ul className="space-y-1.5">
              {items.map((item) => {
                const checked = myChecks.has(item.id);
                const othersCount = (checkedByItem.get(item.id) ?? 0) - (checked ? 1 : 0);
                return (
                  <li key={item.id}>
                    <label className="flex items-center gap-2 text-sm text-ink">
                      <input type="checkbox" checked={checked} onChange={() => toggle(item.id)} className="accent-green" />
                      <span className={checked ? "text-ink-soft line-through" : ""}>{item.label}</span>
                      {othersCount > 0 && <span className="text-xs text-ink-soft/70">+{othersCount} packed</span>}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </AiSectionCard>
  );
}
