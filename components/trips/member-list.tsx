"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { leaveTripAction, removeTripMemberAction } from "@/lib/actions/trip-settings";
import { useRealtimeJoinList } from "@/lib/hooks/use-realtime-list";
import { MemberPermissionToggles } from "@/components/trips/member-permission-toggles";

export interface MemberRow {
  user_id: string;
  display_name: string;
  role: "owner" | "member";
  can_edit_lodging: boolean;
  can_edit_food: boolean;
  can_edit_itinerary: boolean;
  can_edit_flights: boolean;
  profiles: { name: string; avatar_color: string; avatar_url?: string | null } | null;
}

export function MemberList({
  tripId,
  initialMembers,
  currentUserId,
  isOwner,
}: {
  tripId: string;
  initialMembers: MemberRow[];
  currentUserId: string;
  isOwner: boolean;
}) {
  const [members] = useRealtimeJoinList<MemberRow>("trip_members", tripId, initialMembers, (m) => m.user_id);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="space-y-2">
      <h2 className="font-semibold text-ink">Members</h2>
      <div className="space-y-2">
        {members.map((m) => {
          const name = m.profiles?.name ?? m.display_name;
          const isSelf = m.user_id === currentUserId;
          return (
            <div key={m.user_id} className="space-y-2 rounded-2xl border border-line bg-paper px-3.5 py-2.5">
              <div className="flex items-center justify-between">
                <Link href={`/u/${m.user_id}`} className="flex items-center gap-3">
                  <Avatar name={name} color={m.profiles?.avatar_color} avatarUrl={m.profiles?.avatar_url} size={32} />
                  <div>
                    <p className="text-sm font-medium text-ink hover:underline">
                      {name}
                      {isSelf && <span className="text-ink-soft"> (you)</span>}
                    </p>
                    {m.role === "owner" && (
                      <Badge tone="green" className="mt-0.5">
                        Owner
                      </Badge>
                    )}
                  </div>
                </Link>
                {isSelf && m.role !== "owner" && (
                  <Button variant="ghost" size="sm" disabled={pending} onClick={() => startTransition(() => leaveTripAction(tripId))}>
                    Leave
                  </Button>
                )}
                {!isSelf && isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => startTransition(() => removeTripMemberAction(tripId, m.user_id))}
                  >
                    Remove
                  </Button>
                )}
              </div>
              {!isSelf && isOwner && m.role !== "owner" && <MemberPermissionToggles tripId={tripId} member={m} />}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
