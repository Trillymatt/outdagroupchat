"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/ui/avatar";
import { useRealtimeList } from "@/lib/hooks/use-realtime-list";
import { approveJoinRequestAction, denyJoinRequestAction } from "@/lib/actions/trip-settings";
import type { TripJoinRequest } from "@/lib/types/trip";

const categories = [
  { key: "can_edit_lodging", label: "Lodging" },
  { key: "can_edit_food", label: "Food" },
  { key: "can_edit_itinerary", label: "Itinerary" },
  { key: "can_edit_flights", label: "Flights" },
] as const;

type Permissions = Record<(typeof categories)[number]["key"], boolean>;
const defaultPermissions: Permissions = {
  can_edit_lodging: false,
  can_edit_food: false,
  can_edit_itinerary: false,
  can_edit_flights: false,
};

function RequestRow({
  tripId,
  request,
  name,
  color,
}: {
  tripId: string;
  request: TripJoinRequest;
  name: string;
  color?: string;
}) {
  const [permissions, setPermissions] = useState<Permissions>(defaultPermissions);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2 rounded-2xl border border-line bg-paper px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar name={name} color={color} size={32} />
          <p className="text-sm font-medium text-ink">{name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => startTransition(() => denyJoinRequestAction(tripId, request.id))}
          >
            Deny
          </Button>
          <Button size="sm" disabled={pending} onClick={() => startTransition(() => approveJoinRequestAction(tripId, request.id, permissions))}>
            Approve
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-2">
        {categories.map((c) => (
          <label key={c.key} className="flex items-center gap-1.5 text-xs text-ink-soft">
            <Switch
              checked={permissions[c.key]}
              disabled={pending}
              label={`Let ${name} edit ${c.label.toLowerCase()}`}
              onChange={(next) => setPermissions((p) => ({ ...p, [c.key]: next }))}
            />
            {c.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export function PendingJoinRequests({
  tripId,
  initialRequests,
  nameLookup,
}: {
  tripId: string;
  initialRequests: TripJoinRequest[];
  nameLookup: Map<string, { name: string; color?: string }>;
}) {
  const [requests] = useRealtimeList<TripJoinRequest>("trip_join_requests", tripId, initialRequests);
  const pending = requests.filter((r) => r.status === "pending");

  if (pending.length === 0) return null;

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-green-dark" />
        <h2 className="font-semibold text-ink">Join requests</h2>
      </div>
      <div className="space-y-2">
        {pending.map((r) => {
          const who = nameLookup.get(r.user_id) ?? { name: "Someone" };
          return <RequestRow key={r.id} tripId={tripId} request={r} name={who.name} color={who.color} />;
        })}
      </div>
    </Card>
  );
}
