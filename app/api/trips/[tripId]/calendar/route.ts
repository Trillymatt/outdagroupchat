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

  const { data: items } = await supabase
    .from("itinerary_items")
    .select("id, title, day, time, description, location, link, position")
    .eq("trip_id", tripId)
    .order("day", { ascending: true })
    .order("position", { ascending: true });

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

  // Itinerary items only carry a day plus optional "HH:MM" text (no timezone),
  // so each becomes an all-day event with the time noted in the description.
  for (const item of items ?? []) {
    const descriptionParts: string[] = [];
    if (item.time) descriptionParts.push(`Time: ${formatTime(item.time)}`);
    if (item.description) descriptionParts.push(item.description);
    events.push({
      uid: `itinerary-${item.id}@tandem`,
      summary: item.title,
      description: descriptionParts.length > 0 ? descriptionParts.join("\n") : null,
      location: item.location,
      url: item.link,
      allDay: true,
      start: item.day,
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
