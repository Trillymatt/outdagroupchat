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

  return (
    <Card className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
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
