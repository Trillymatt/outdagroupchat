import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchFlights, AmadeusError } from "@/lib/flights/amadeus-client";

export const maxDuration = 30;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const tripId = body?.tripId;
  const origin = body?.origin;
  const destination = body?.destination;
  const departDate = body?.departDate;
  const returnDate = body?.returnDate;
  const nonstopOnly = Boolean(body?.nonstopOnly);

  if (typeof tripId !== "string" || typeof origin !== "string" || typeof destination !== "string" || typeof departDate !== "string") {
    return NextResponse.json({ error: "tripId, origin, destination, and departDate are required" }, { status: 400 });
  }
  if (origin.trim().length !== 3 || destination.trim().length !== 3) {
    return NextResponse.json({ error: "Airport codes should be 3-letter IATA codes, e.g. JFK" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: trip } = await supabase.from("trips").select("id").eq("id", tripId).single();
  if (!trip) return NextResponse.json({ error: "Trip not found, or you're not a member" }, { status: 404 });

  try {
    const results = await searchFlights({
      origin: origin.trim(),
      destination: destination.trim(),
      departDate,
      returnDate: typeof returnDate === "string" && returnDate ? returnDate : undefined,
      nonstopOnly,
    });
    return NextResponse.json({ results });
  } catch (err) {
    if (err instanceof AmadeusError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong searching for flights." }, { status: 500 });
  }
}
