import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Log in — Tandem" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const { redirect } = await searchParams;
  return (
    <>
      <LoginForm redirectTo={redirect} />
      <p className="mt-4 text-center text-sm">
        <Link href="/forgot-password" className="inline-flex min-h-10 items-center text-ink-soft transition-colors hover:text-ink sm:min-h-0">
          Forgot password?
        </Link>
      </p>
    </>
  );
}
