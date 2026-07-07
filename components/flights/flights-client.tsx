"use client";

import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeList } from "@/lib/hooks/use-realtime-list";
import { ProgressPill } from "@/components/ui/badge";
import { FlightCard } from "@/components/flights/flight-card";
import type { FlightFormValues } from "@/components/flights/flight-form";
import type { Flight } from "@/lib/types/trip";
import type { FlightStatus } from "@/lib/supabase/database.types";

export function FlightsClient({
  tripId,
  currentUserId,
  members,
  initialFlights,
  destination,
  startDate,
  endDate,
}: {
  tripId: string;
  currentUserId: string;
  members: { userId: string; name: string; color?: string }[];
  initialFlights: Flight[];
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
}) {
  const [flights, setFlights] = useRealtimeList<Flight>("flights", tripId, initialFlights);

  const flightByUser = useMemo(() => new Map(flights.map((f) => [f.user_id, f])), [flights]);
  const bookedCount = flights.filter((f) => f.status === "booked").length;

  async function saveFlight(values: FlightFormValues, status: FlightStatus) {
    const supabase = createClient();
    const payload = {
      trip_id: tripId,
      user_id: currentUserId,
      status,
      airline: values.airline.trim() || null,
      flight_number: values.flight_number.trim() || null,
      price: values.price ? Number(values.price) : null,
      departure_airport: values.departure_airport.trim() || null,
      arrival_airport: values.arrival_airport.trim() || null,
      departure_time: values.departure_time ? new Date(values.departure_time).toISOString() : null,
      arrival_time: values.arrival_time ? new Date(values.arrival_time).toISOString() : null,
      booking_link: values.booking_link.trim() || null,
      notes: values.notes.trim() || null,
    };

    const { data, error } = await supabase.from("flights").upsert(payload, { onConflict: "trip_id,user_id" }).select().single();
    if (!error && data) {
      setFlights((prev) => (prev.some((f) => f.id === data.id) ? prev.map((f) => (f.id === data.id ? data : f)) : [...prev, data]));
    }
  }

  async function setStatus(status: FlightStatus) {
    const supabase = createClient();
    const existing = flightByUser.get(currentUserId);
    const { data, error } = await supabase
      .from("flights")
      .upsert({ ...(existing ?? {}), trip_id: tripId, user_id: currentUserId, status }, { onConflict: "trip_id,user_id" })
      .select()
      .single();
    if (!error && data) {
      setFlights((prev) => (prev.some((f) => f.id === data.id) ? prev.map((f) => (f.id === data.id ? data : f)) : [...prev, data]));
    }
  }

  return (
    <div className="space-y-4">
      <ProgressPill label="booked" done={bookedCount} total={members.length} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {members.map((member) => (
          <FlightCard
            key={member.userId}
            member={member}
            flight={flightByUser.get(member.userId) ?? null}
            isSelf={member.userId === currentUserId}
            destination={destination}
            startDate={startDate}
            endDate={endDate}
            onSave={saveFlight}
            onStatusChange={setStatus}
          />
        ))}
      </div>
    </div>
  );
}
