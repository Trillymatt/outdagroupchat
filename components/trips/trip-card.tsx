import Link from "next/link";
import { HoverCard } from "@/components/ui/card";
import { AvatarStack } from "@/components/ui/avatar";
import { ProgressPill } from "@/components/ui/badge";
import { formatDateRange } from "@/lib/utils/dates";

export interface TripCardData {
  id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_image: string | null;
  members: { name: string; color?: string }[];
  flightsBooked: number;
  flightsTotal: number;
}

export function TripCard({ trip }: { trip: TripCardData }) {
  return (
    <Link href={`/trips/${trip.id}/overview`}>
      <HoverCard className="h-full space-y-3 overflow-hidden">
        {trip.cover_image && (
          // eslint-disable-next-line @next/next/no-img-element -- remote Unsplash/Storage URL
          <img src={trip.cover_image} alt="" className="-mx-5 -mt-5 mb-1 h-28 w-[calc(100%+2.5rem)] max-w-none object-cover" />
        )}
        <div>
          <h3 className="font-semibold text-ink">{trip.name}</h3>
          <p className="text-sm text-ink-soft">{trip.destination || "Destination TBD"}</p>
        </div>
        <p className="text-sm font-medium text-green-dark">{formatDateRange(trip.start_date, trip.end_date)}</p>
        <div className="flex items-center justify-between pt-1">
          <AvatarStack members={trip.members} size={28} />
          {trip.flightsTotal > 0 && <ProgressPill label="flights booked" done={trip.flightsBooked} total={trip.flightsTotal} />}
        </div>
      </HoverCard>
    </Link>
  );
}
