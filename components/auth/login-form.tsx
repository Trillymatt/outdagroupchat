"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, type AuthFormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";

const initialState: AuthFormState = undefined;

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);
  const signupHref = redirectTo ? `/signup?redirect=${encodeURIComponent(redirectTo)}` : "/signup";
  const joiningTrip = redirectTo?.startsWith("/join/") ?? false;

  return (
    <Card className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{joiningTrip ? "Sign in to join the trip" : "Welcome back"}</h1>
        {joiningTrip && <p className="mt-1 text-sm text-ink-soft">Your invitation is saved. You’ll continue to it after signing in.</p>}
      </div>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="redirect" value={redirectTo ?? ""} />
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <FieldError>{state?.error}</FieldError>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="text-center text-sm text-ink-soft">
        New to Tandem?{" "}
        <Link href={signupHref} className="inline-flex min-h-10 items-center font-medium text-green-dark sm:min-h-0">
          Create an account
        </Link>
      </p>
    </Card>
  );
}
