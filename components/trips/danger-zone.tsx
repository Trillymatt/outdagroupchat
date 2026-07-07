"use client";

import { useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteTripAction } from "@/lib/actions/trip-settings";

export function DangerZone({ tripId }: { tripId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Card className="space-y-3 border-danger/30">
      <h2 className="font-semibold text-danger">Danger zone</h2>
      <p className="text-sm text-ink-soft">Deleting a trip removes it for everyone and can&apos;t be undone.</p>
      <Button
        variant="danger"
        disabled={pending}
        onClick={() => {
          if (confirm("Delete this trip for everyone? This can't be undone.")) {
            startTransition(() => deleteTripAction(tripId));
          }
        }}
      >
        Delete trip
      </Button>
    </Card>
  );
}
