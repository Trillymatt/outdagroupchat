"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updatePasswordAction, type AuthFormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";

const initialState: AuthFormState = undefined;

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialState);

  return (
    <Card className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-ink-soft">You&apos;ll be signed in once it&apos;s saved.</p>
      </div>
      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" autoFocus />
        </div>
        <div>
          <Label htmlFor="confirm_password">Confirm new password</Label>
          <Input id="confirm_password" name="confirm_password" type="password" required minLength={8} autoComplete="new-password" />
        </div>
        <FieldError>{state?.error}</FieldError>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving…" : "Save new password"}
        </Button>
      </form>
      {state?.error?.includes("expired") ? (
        <p className="text-center text-sm text-ink-soft">
          <Link href="/forgot-password" className="font-medium text-green-dark">
            Request a new reset link
          </Link>
        </p>
      ) : null}
    </Card>
  );
}
