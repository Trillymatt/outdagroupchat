import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lookupFlight, AmadeusError } from "@/lib/flights/amadeus-client";

export const maxDuration = 30;

// Split "AA123" / "aa 123" into a carrier code and numeric flight number.
function parseFlightNumber(raw: string): { carrierCode: string; flightNumber: string } | null {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, "");
  const match = /^([A-Z0-9]{2,3})(\d{1,4})$/.exec(cleaned);
  if (!match) return null;
  return { carrierCode: match[1], flightNumber: match[2] };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const tripId = body?.tripId;
  const flightNumber = body?.flightNumber;
  const date = body?.date;

  if (typeof tripId !== "string" || typeof flightNumber !== "string" || typeof date !== "string") {
    return NextResponse.json({ error: "tripId, flightNumber, and date are required" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Pick a valid departure date." }, { status: 400 });
  }

  const parsed = parseFlightNumber(flightNumber);
  if (!parsed) {
    return NextResponse.json({ error: "Enter a flight number like AA123." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: trip } = await supabase.from("trips").select("id").eq("id", tripId).single();
  if (!trip) return NextResponse.json({ error: "Trip not found, or you're not a member" }, { status: 404 });

  try {
    const result = await lookupFlight({ carrierCode: parsed.carrierCode, flightNumber: parsed.flightNumber, date });
    if (!result) {
      return NextResponse.json({ error: "No scheduled flight found for that number and date." }, { status: 404 });
    }
    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof AmadeusError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong looking up that flight." }, { status: 500 });
  }
}
