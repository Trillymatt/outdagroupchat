"use client";

import { useActionState } from "react";
import { joinTripAction, type TripFormState } from "@/lib/actions/trips";
import { Card } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: TripFormState = undefined;

export function JoinTripForm({ defaultCode }: { defaultCode?: string }) {
  const [state, formAction, pending] = useActionState(joinTripAction, initialState);

  return (
    <Card className="max-w-lg space-y-4">
      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="invite_code">Invite code</Label>
          <Input
            id="invite_code"
            name="invite_code"
            placeholder="e.g. 7XQK3RM"
            defaultValue={defaultCode}
            required
            autoFocus
            className="uppercase tracking-widest"
          />
        </div>
        <FieldError>{state?.error}</FieldError>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Joining…" : "Join trip"}
        </Button>
      </form>
    </Card>
  );
}
