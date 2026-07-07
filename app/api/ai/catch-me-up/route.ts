import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateStructured, AiGenerationError } from "@/lib/ai/client";

export const maxDuration = 30;

const ResponseSchema = z.object({
  summary: z.string().describe("2-4 short sentences in a casual, friendly tone, plain text (no markdown)"),
  decided: z.array(z.string()).max(8).describe("Short bullet points of what's been decided so far"),
  open: z.array(z.string()).max(8).describe("Short bullet points of what's still open or undecided"),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const tripId = body?.tripId;
  if (typeof tripId !== "string") {
    return NextResponse.json({ error: "tripId is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: trip } = await supabase.from("trips").select("name, destination, start_date, end_date").eq("id", tripId).single();
  if (!trip) return NextResponse.json({ error: "Trip not found, or you're not a member" }, { status: 404 });

  const [{ data: members }, { data: itineraryItems }, { data: lodging }, { data: restaurants }, { data: flights }] = await Promise.all([
    supabase.from("trip_members").select("user_id, display_name"),
    supabase.from("itinerary_items").select("day, title").eq("trip_id", tripId),
    supabase.from("lodging_options").select("name, status, price_per_night").eq("trip_id", tripId),
    supabase.from("restaurants").select("name").eq("trip_id", tripId),
    supabase.from("flights").select("status").eq("trip_id", tripId),
  ]);

  const memberCount = (members ?? []).length;
  const bookedLodging = (lodging ?? []).filter((l) => l.status === "booked");
  const proposedLodging = (lodging ?? []).filter((l) => l.status === "proposed");
  const bookedFlights = (flights ?? []).filter((f) => f.status === "booked").length;
  const searchingFlights = (flights ?? []).filter((f) => f.status === "searching").length;

  const prompt = `Trip: ${trip.name}
Destination: ${trip.destination ?? "unspecified"}
Dates: ${trip.start_date ?? "not locked in yet"} to ${trip.end_date ?? "not locked in yet"}
Group size: ${memberCount} people

Lodging: ${bookedLodging.length > 0 ? `Booked — ${bookedLodging.map((l) => l.name).join(", ")}` : `Not booked yet. ${proposedLodging.length} option(s) proposed: ${proposedLodging.map((l) => l.name).join(", ") || "none"}`}
Flights: ${bookedFlights} of ${memberCount} members booked, ${searchingFlights} still searching.
Itinerary: ${itineraryItems && itineraryItems.length > 0 ? `${itineraryItems.length} item(s) planned, e.g. ${itineraryItems.slice(0, 5).map((i) => i.title).join(", ")}` : "Nothing planned yet."}
Food recommendations: ${restaurants && restaurants.length > 0 ? `${restaurants.length} suggested (${restaurants.map((r) => r.name).join(", ")})` : "None added yet."}

Write a short "catch me up" summary for someone in the group chat who's behind on trip planning. Cover what's
been decided so far and what's still open, in a casual, friendly tone — like a quick recap from a friend, not a
formal report.`;

  try {
    const result = await generateStructured({
      system:
        "You write short, casual catch-up summaries for a friend group's shared trip planning app, so someone who missed the group chat can quickly see what's settled and what still needs input.",
      prompt,
      schema: ResponseSchema,
      maxTokens: 1024,
    });

    const { data: inserted, error } = await supabase
      .from("ai_suggestions")
      .insert({
        trip_id: tripId,
        type: "catch_me_up",
        content: result,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ suggestion: inserted });
  } catch (err) {
    if (err instanceof AiGenerationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong generating the summary." }, { status: 500 });
  }
}
