"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type AuthFormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";

const initialState: AuthFormState = undefined;

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState);

  if (state?.message) {
    return (
      <Card className="space-y-2 text-center">
        <p className="font-semibold text-ink">Check your inbox</p>
        <p className="text-sm text-ink-soft">{state.message}</p>
        <Link href="/login" className="mt-2 inline-block text-sm font-medium text-green-dark">
          Back to login
        </Link>
      </Card>
    );
  }

  return (
    <Card className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Forgot your password?</h1>
        <p className="text-sm text-ink-soft">Enter your email and we&apos;ll send you a link to reset it.</p>
      </div>
      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" autoFocus />
        </div>
        <FieldError>{state?.error}</FieldError>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="text-center text-sm text-ink-soft">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-green-dark">
          Back to login
        </Link>
      </p>
    </Card>
  );
}
