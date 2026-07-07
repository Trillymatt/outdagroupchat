import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateStructured, AiGenerationError } from "@/lib/ai/client";

export const maxDuration = 30;

const ResponseSchema = z.object({
  suggestions: z
    .array(
      z.object({
        day: z.string().describe("ISO date (YYYY-MM-DD) within the trip's date range"),
        time: z.string().nullable().describe("24-hour HH:MM time, or null if flexible"),
        title: z.string(),
        description: z.string(),
        location: z.string().nullable(),
        category: z.enum(["activity", "food", "transport", "lodging", "other"]),
        rationale: z.string().describe("One short sentence on why this fills a gap in the schedule"),
      }),
    )
    .max(6),
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

  const { data: items } = await supabase
    .from("itinerary_items")
    .select("day, time, title, category, location")
    .eq("trip_id", tripId)
    .order("day", { ascending: true });

  const existingSummary =
    items && items.length > 0
      ? items.map((i) => `${i.day}${i.time ? ` ${i.time}` : ""} — ${i.title} (${i.category}${i.location ? `, ${i.location}` : ""})`).join("\n")
      : "Nothing planned yet.";

  const prompt = `Trip: ${trip.name}
Destination: ${trip.destination ?? "unspecified"}
Dates: ${trip.start_date ?? "not set"} to ${trip.end_date ?? "not set"}

Existing itinerary:
${existingSummary}

Suggest up to 5 additional activities, attractions, or meals that would fill gaps in the schedule (empty
afternoons/evenings, missing meals, etc). Prefer specific, real, well-known places or experiences over generic
filler. Don't duplicate anything already on the itinerary. Every suggestion's "day" must be a real ISO date. If
the trip has no dates set and there's nothing already on the itinerary to infer dates from, return an empty
suggestions array rather than guessing dates.`;

  try {
    const result = await generateStructured({
      system:
        "You are a friendly, knowledgeable local trip-planning assistant helping a group of friends fill gaps in their shared itinerary. Be concrete and specific to the destination, not generic. Never invent a specific business you're not reasonably confident is real; prefer well-known landmarks, neighborhoods, and activity types when unsure.",
      prompt,
      schema: ResponseSchema,
      maxTokens: 2048,
    });

    if (result.suggestions.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    const { data: inserted, error } = await supabase
      .from("ai_suggestions")
      .insert(
        result.suggestions.map((s) => ({
          trip_id: tripId,
          type: "itinerary" as const,
          content: s,
          created_by: user.id,
        })),
      )
      .select();

    if (error) throw error;
    return NextResponse.json({ suggestions: inserted });
  } catch (err) {
    if (err instanceof AiGenerationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong generating suggestions." }, { status: 500 });
  }
}
