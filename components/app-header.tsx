import Link from "next/link";
import { signOutAction } from "@/lib/actions/auth";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function AppHeader({ profile }: { profile: { name: string; avatar_color: string; avatar_url: string | null } }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-4">
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
      </div>
    </header>
  );
}
