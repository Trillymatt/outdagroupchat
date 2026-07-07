"use client";

import { useActionState, useState, useTransition } from "react";
import { updateAccountAction, sendTestSmsAction, type AccountFormState } from "@/lib/actions/account";
import { Card } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types/trip";

const initialState: AccountFormState = undefined;

export function AccountForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateAccountAction, initialState);
  const [phone, setPhone] = useState(profile.phone_number ?? "");
  const [smsOptIn, setSmsOptIn] = useState(profile.sms_opt_in);
  const [testPending, startTestTransition] = useTransition();
  const [testResult, setTestResult] = useState<{ error?: string; success?: boolean } | null>(null);

  return (
    <Card className="space-y-4">
      <h2 className="font-semibold text-ink">SMS notifications</h2>
      <p className="text-sm text-ink-soft">Optional — add a number if you want text alerts for this trip. Everything else works without it.</p>
      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="phone_number">Phone number</Label>
          <Input
            id="phone_number"
            name="phone_number"
            type="tel"
            placeholder="+1 555 555 5555"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            name="sms_opt_in"
            checked={smsOptIn}
            onChange={(e) => setSmsOptIn(e.target.checked)}
            disabled={!phone}
            className="mt-0.5 accent-green"
          />
          Send me SMS notifications
        </label>
        {state?.error && <FieldError>{state.error}</FieldError>}
        {state?.success && <p className="text-sm font-medium text-success">Saved.</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>
      {phone && smsOptIn && (
        <div className="border-t border-line pt-4">
          <Button
            variant="secondary"
            size="sm"
            disabled={testPending}
            onClick={() =>
              startTestTransition(async () => {
                setTestResult(null);
                setTestResult(await sendTestSmsAction());
              })
            }
          >
            {testPending ? "Sending…" : "Send test text"}
          </Button>
          {testResult?.error && <FieldError>{testResult.error}</FieldError>}
          {testResult?.success && <p className="mt-1.5 text-sm font-medium text-success">Test text sent.</p>}
        </div>
      )}
    </Card>
  );
}
