"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signUpAction, type AuthFormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";

const initialState: AuthFormState = undefined;

export function SignupForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);
  const [phone, setPhone] = useState("");
  const loginHref = redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login";
  const joiningTrip = redirectTo?.startsWith("/join/") ?? false;

  if (state?.message) {
    return (
      <Card className="space-y-2 text-center">
        <p className="font-semibold text-ink">Almost there</p>
        <p className="text-sm text-ink-soft">{state.message}</p>
        <Link href={loginHref} className="mt-2 inline-block text-sm font-medium text-green-dark">
          Back to login
        </Link>
      </Card>
    );
  }

  return (
    <Card className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{joiningTrip ? "Create an account to join" : "Create your account"}</h1>
        {joiningTrip && <p className="mt-1 text-sm text-ink-soft">Your invitation is saved and will be waiting after account confirmation.</p>}
      </div>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="redirect" value={redirectTo ?? ""} />
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required autoComplete="name" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </div>
        <div>
          <Label htmlFor="phone_number">
            Phone number <span className="font-normal normal-case text-ink-soft/70">(optional)</span>
          </Label>
          <Input
            id="phone_number"
            name="phone_number"
            type="tel"
            placeholder="+1 555 555 5555"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-ink-soft">
          <input type="checkbox" name="sms_opt_in" disabled={!phone} className="mt-0.5 accent-green" />
          Send me SMS notifications (you can change this anytime in account settings)
        </label>
        <FieldError>{state?.error}</FieldError>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href={loginHref} className="font-medium text-green-dark">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
