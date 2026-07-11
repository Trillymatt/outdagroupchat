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
        <Link href="/forgot-password" className="text-ink-soft transition-colors hover:text-ink">
          Forgot password?
        </Link>
      </p>
    </>
  );
}
