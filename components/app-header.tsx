import Link from "next/link";
import { signOutAction } from "@/lib/actions/auth";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Menu } from "lucide-react";

export function AppHeader({ profile }: { profile: { name: string; avatar_color: string; avatar_url: string | null } }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-4 sm:flex">
          <Link href="/dashboard" className="hidden text-sm font-medium text-ink-soft hover:text-ink sm:block">
            My trips
          </Link>
          <ThemeToggle />
          <Link href="/account" title="Account settings">
            <Avatar name={profile.name} color={profile.avatar_color} avatarUrl={profile.avatar_url} size={28} />
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="text-sm font-medium text-ink-soft hover:text-danger">
              Sign out
            </button>
          </form>
        </nav>
        <details className="group relative sm:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-line bg-surface text-ink-soft [&::-webkit-details-marker]:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </summary>
          <div className="absolute right-0 top-12 z-30 w-52 space-y-1 rounded-2xl border border-line bg-surface p-2 shadow-xl">
            <Link href="/dashboard" className="block rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-ink/5">
              My trips
            </Link>
            <Link href="/account" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-ink/5">
              <Avatar name={profile.name} color={profile.avatar_color} avatarUrl={profile.avatar_url} size={24} />
              Account
            </Link>
            <div className="flex items-center justify-between rounded-xl px-3 py-1 text-sm font-medium text-ink">
              Appearance
              <ThemeToggle />
            </div>
            <form action={signOutAction}>
              <button type="submit" className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-danger hover:bg-danger/5">
                Sign out
              </button>
            </form>
          </div>
        </details>
      </div>
    </header>
  );
}
