import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildCalendar, addDays, type IcsEvent } from "@/lib/utils/ics";

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "trip";
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = Number(h);
  if (Number.isNaN(hour)) return time;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${m ?? "00"} ${period}`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // RLS restricts trips to members, so a miss here is either a bad id or a non-member.
  const { data: trip } = await supabase
    .from("trips")
    .select("id, name, destination, start_date, end_date")
    .eq("id", tripId)
    .single();
  if (!trip) return NextResponse.json({ error: "Trip not found, or you're not a member" }, { status: 404 });

  const [{ data: items }, { data: flights }, { data: members }] = await Promise.all([
    supabase
      .from("itinerary_items")
      .select("id, title, day, time, description, location, link, position")
      .eq("trip_id", tripId)
      .order("day", { ascending: true })
      .order("position", { ascending: true }),
    supabase.from("flights").select("*").eq("trip_id", tripId).not("departure_time", "is", null),
    supabase.from("trip_members").select("user_id, display_name, profiles(name)").eq("trip_id", tripId),
  ]);

  const nameOf = new Map(
    (members ?? []).map((m) => {
      const profile = (m as unknown as { profiles: { name: string } | null }).profiles;
      return [m.user_id, profile?.name ?? m.display_name];
    }),
  );

  const events: IcsEvent[] = [];

  if (trip.start_date && trip.end_date) {
    events.push({
      uid: `trip-${trip.id}@tandem`,
      summary: trip.destination ? `${trip.name} — ${trip.destination}` : trip.name,
      location: trip.destination,
      allDay: true,
      start: trip.start_date,
      // DTEND is exclusive for all-day events, so span through the last trip day.
      end: addDays(trip.end_date, 1),
    });
  }

  for (const item of items ?? []) {
    const descriptionParts: string[] = [];
    if (item.time) descriptionParts.push(`Time: ${formatTime(item.time)}`);
    if (item.description) descriptionParts.push(item.description);
    const description = descriptionParts.length > 0 ? descriptionParts.join("\n") : null;

    if (item.time) {
      // Floating local time: shows at destination wall-clock time on any device.
      events.push({
        uid: `itinerary-${item.id}@tandem`,
        summary: item.title,
        description,
        location: item.location,
        url: item.link,
        allDay: false,
        floating: true,
        day: item.day,
        time: item.time,
      });
    } else {
      events.push({
        uid: `itinerary-${item.id}@tandem`,
        summary: item.title,
        description,
        location: item.location,
        url: item.link,
        allDay: true,
        start: item.day,
      });
    }
  }

  for (const flight of flights ?? []) {
    if (!flight.departure_time) continue;
    const who = nameOf.get(flight.user_id) ?? "Member";
    const route = [flight.departure_airport, flight.arrival_airport].filter(Boolean).join(" → ");
    const label = [flight.airline, flight.flight_number].filter(Boolean).join(" ");
    events.push({
      uid: `flight-${flight.id}@tandem`,
      summary: `✈️ ${who}: ${label || "Flight"}${route ? ` (${route})` : ""}`,
      description: flight.notes ?? null,
      allDay: false,
      start: new Date(flight.departure_time),
      end: flight.arrival_time ? new Date(flight.arrival_time) : undefined,
    });
  }

  const ics = buildCalendar({ calendarName: trip.name, events, now: new Date() });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="tandem-${slugify(trip.name)}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
