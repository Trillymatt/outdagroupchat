"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { setTripCompletedAction } from "@/lib/actions/trip-settings";

export function TripCompletionCard({ tripId, initialCompleted }: { tripId: string; initialCompleted: boolean }) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !completed;
    setCompleted(next);
    startTransition(() => setTripCompletedAction(tripId, next));
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-dark" />
        <h2 className="font-semibold text-ink">Trip completion</h2>
      </div>
      <p className="text-sm text-ink-soft">
        {completed
          ? "This trip is marked completed and shows up in members' trip history on their profile."
          : "Mark this trip completed once it's over — it'll show up in members' trip history on their profile."}
      </p>
      <Button variant={completed ? "secondary" : "primary"} disabled={pending} onClick={toggle}>
        {completed ? "Mark as not completed" : "Mark trip completed"}
      </Button>
    </Card>
  );
}
