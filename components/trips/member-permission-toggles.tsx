"use client";

import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { setTripMemberPermissionAction } from "@/lib/actions/trip-settings";
import type { MemberRow } from "@/components/trips/member-list";

const categories = [
  { key: "can_edit_lodging", label: "Lodging" },
  { key: "can_edit_food", label: "Food" },
  { key: "can_edit_itinerary", label: "Itinerary" },
  { key: "can_edit_flights", label: "Flights" },
] as const;

export function MemberPermissionToggles({ tripId, member }: { tripId: string; member: MemberRow }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-2">
      {categories.map((c) => (
        <label key={c.key} className="flex items-center gap-1.5 text-xs text-ink-soft">
          <Switch
            checked={member[c.key]}
            disabled={pending}
            label={`Allow ${member.display_name} to edit ${c.label.toLowerCase()}`}
            onChange={(next) => startTransition(() => setTripMemberPermissionAction(tripId, member.user_id, { [c.key]: next }))}
          />
          {c.label}
        </label>
      ))}
    </div>
  );
}
