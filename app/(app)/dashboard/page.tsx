import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TripCard, type TripCardData } from "@/components/trips/trip-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { RouteBackdrop } from "@/components/ui/route-line";

export const metadata: Metadata = { title: "My trips — Tandem" };

interface RawTrip {
  id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_image: string | null;
  trip_members: { display_name: string; profiles: { name: string; avatar_color: string } | null }[];
  flights: { status: string }[];
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("trips")
    .select("id, name, destination, start_date, end_date, cover_image, trip_members(display_name, profiles(name, avatar_color)), flights(status)")
    .order("start_date", { ascending: true, nullsFirst: false });

  const trips = ((data ?? []) as unknown as RawTrip[]).map((trip): TripCardData & { isPast: boolean } => ({
    id: trip.id,
    name: trip.name,
    destination: trip.destination,
    start_date: trip.start_date,
    end_date: trip.end_date,
    cover_image: trip.cover_image,
    members: trip.trip_members.map((m) => ({ name: m.profiles?.name ?? m.display_name, color: m.profiles?.avatar_color })),
    flightsTotal: trip.trip_members.length,
    flightsBooked: trip.flights.filter((f) => f.status === "booked").length,
    isPast: Boolean(trip.end_date && new Date(trip.end_date) < new Date(new Date().toDateString())),
  }));

  const upcoming = trips.filter((t) => !t.isPast);
  const past = trips.filter((t) => t.isPast);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-full opacity-25">
          <RouteBackdrop className="h-full w-full" />
        </div>
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Mission control</h1>
            <p className="mt-1 text-sm text-ink-soft">Every trip you're part of, past and upcoming, in one place.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/trips/join">
              <Button variant="secondary">Join with code</Button>
            </Link>
            <Link href="/trips/new">
              <Button>Create a trip</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Upcoming</h2>
        {upcoming.length === 0 ? (
          <EmptyState
            title="No upcoming trips yet"
            description="Create a trip or join one with an invite code to get started."
            action={
              <Link href="/trips/new">
                <Button size="sm">Create a trip</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Past</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
