import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545 says content lines should be folded at 75 octets. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = " " + rest.slice(75);
  }
  parts.push(rest);
  return parts.join("\r\n");
}

/** Floating local time — shows at destination wall-clock time on any device. */
function localDateTime(day: string, time: string): string {
  return `${day.replace(/-/g, "")}T${time.replace(/:/g, "").slice(0, 6).padEnd(6, "0")}`;
}

function utcDateTime(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function addOneHour(day: string, time: string): string {
  const d = new Date(`${day}T${time}`);
  d.setHours(d.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function nextDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // RLS returns nothing unless the caller is a member of the trip
  const { data: trip } = await supabase.from("trips").select("id, name, destination").eq("id", tripId).single();
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const [{ data: items }, { data: flights }, { data: members }] = await Promise.all([
    supabase.from("itinerary_items").select("*").eq("trip_id", tripId).order("day").order("position"),
    supabase.from("flights").select("*").eq("trip_id", tripId).not("departure_time", "is", null),
    supabase.from("trip_members").select("user_id, display_name, profiles(name)").eq("trip_id", tripId),
  ]);

  const nameOf = new Map(
    (members ?? []).map((m) => {
      const profile = (m as unknown as { profiles: { name: string } | null }).profiles;
      return [m.user_id, profile?.name ?? m.display_name];
    }),
  );

  const now = utcDateTime(new Date().toISOString());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tandem//Trip Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${escapeText(trip.name)}`),
  ];

  for (const item of items ?? []) {
    lines.push("BEGIN:VEVENT", `UID:itinerary-${item.id}@tandem`, `DTSTAMP:${now}`);
    if (item.time) {
      lines.push(`DTSTART:${localDateTime(item.day, item.time)}`, `DTEND:${addOneHour(item.day, item.time)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${item.day.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${nextDay(item.day)}`);
    }
    lines.push(fold(`SUMMARY:${escapeText(item.title)}`));
    if (item.description) lines.push(fold(`DESCRIPTION:${escapeText(item.description)}`));
    if (item.location) lines.push(fold(`LOCATION:${escapeText(item.location)}`));
    if (item.link) lines.push(fold(`URL:${escapeText(item.link)}`));
    lines.push("END:VEVENT");
  }

  for (const flight of flights ?? []) {
    const who = nameOf.get(flight.user_id) ?? "Member";
    const route = [flight.departure_airport, flight.arrival_airport].filter(Boolean).join(" → ");
    const label = [flight.airline, flight.flight_number].filter(Boolean).join(" ");
    lines.push(
      "BEGIN:VEVENT",
      `UID:flight-${flight.id}@tandem`,
      `DTSTAMP:${now}`,
      `DTSTART:${utcDateTime(flight.departure_time!)}`,
      `DTEND:${utcDateTime(flight.arrival_time ?? flight.departure_time!)}`,
      fold(`SUMMARY:${escapeText(`✈️ ${who}: ${label || "Flight"}${route ? ` (${route})` : ""}`)}`),
    );
    if (flight.notes) lines.push(fold(`DESCRIPTION:${escapeText(flight.notes)}`));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  const slug = trip.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "trip";
  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
    },
  });
}
