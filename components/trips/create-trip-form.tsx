"use client";

import { useActionState } from "react";
import { createTripAction, type TripFormState } from "@/lib/actions/trips";
import { Card } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: TripFormState = undefined;

export function CreateTripForm() {
  const [state, formAction, pending] = useActionState(createTripAction, initialState);

  return (
    <Card className="max-w-lg space-y-4">
      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="name">Trip name</Label>
          <Input id="name" name="name" placeholder="Bachelorette in Lisbon" required autoFocus />
        </div>
        <div>
          <Label htmlFor="destination">Destination</Label>
          <Input id="destination" name="destination" placeholder="Lisbon, Portugal" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="start_date">Start date</Label>
            <Input id="start_date" name="start_date" type="date" />
          </div>
          <div>
            <Label htmlFor="end_date">End date</Label>
            <Input id="end_date" name="end_date" type="date" />
          </div>
        </div>
        <p className="text-xs text-ink-soft">Not sure on dates yet? Leave them blank — you can propose options for the group to vote on.</p>
        <FieldError>{state?.error}</FieldError>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating…" : "Create trip"}
        </Button>
      </form>
    </Card>
  );
}
