import { AvatarStack } from "@/components/ui/avatar";
import { formatDateRange } from "@/lib/utils/dates";

export interface TripHeaderData {
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  trip_members: { display_name: string; profiles: { name: string; avatar_color: string } | null }[];
}

export function TripHeader({ trip }: { trip: TripHeaderData }) {
  const members = trip.trip_members.map((m) => ({ name: m.profiles?.name ?? m.display_name, color: m.profiles?.avatar_color }));

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{trip.name}</h1>
        <p className="text-sm text-ink-soft">
          {trip.destination || "Destination TBD"} · {formatDateRange(trip.start_date, trip.end_date)}
        </p>
      </div>
      <AvatarStack members={members} size={32} />
    </div>
  );
}
