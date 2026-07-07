import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateStructured, AiGenerationError } from "@/lib/ai/client";

export const maxDuration = 30;

const ResponseSchema = z.object({
  trip_type: z.string().describe("Inferred trip type in a couple words, e.g. 'beach', 'hiking/outdoors', 'city sightseeing', 'ski'"),
  items: z
    .array(
      z.object({
        label: z.string(),
        category: z.string().describe("e.g. Clothing, Toiletries, Documents, Gear, Electronics"),
      }),
    )
    .max(35),
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
    .select("title, category, description")
    .eq("trip_id", tripId)
    .limit(40);

  const itinerarySummary =
    items && items.length > 0
      ? items.map((i) => `${i.title} (${i.category})${i.description ? `: ${i.description}` : ""}`).join("\n")
      : "No itinerary items yet — infer purely from the destination and dates.";

  const nights =
    trip.start_date && trip.end_date
      ? Math.max(1, Math.round((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86_400_000))
      : null;

  const prompt = `Trip: ${trip.name}
Destination: ${trip.destination ?? "unspecified"}
Dates: ${trip.start_date ?? "not set"} to ${trip.end_date ?? "not set"}${nights ? ` (${nights} nights)` : ""}

Itinerary so far:
${itinerarySummary}

Infer the general type of trip this is (beach, hiking/outdoors, city sightseeing, ski, road trip, festival, etc)
from the destination and itinerary above, then generate a practical packing list a member of the group could
check off individually. Group items sensibly by category. Keep it to genuinely useful, non-obvious-yet-easy-to-
forget items alongside the basics — don't pad the list with filler.`;

  try {
    const result = await generateStructured({
      system:
        "You are a practical, experienced traveler generating a packing list for a group trip. Tailor it specifically to the destination, season/dates if inferable, and trip type — don't produce a generic one-size-fits-all list.",
      prompt,
      schema: ResponseSchema,
      maxTokens: 2048,
    });

    if (result.items.length === 0) {
      return NextResponse.json({ items: [], tripType: result.trip_type });
    }

    const { data: inserted, error } = await supabase
      .from("packing_items")
      .insert(
        result.items.map((item) => ({
          trip_id: tripId,
          label: item.label,
          category: item.category,
          source: "ai" as const,
        })),
      )
      .select();

    if (error) throw error;
    return NextResponse.json({ items: inserted, tripType: result.trip_type });
  } catch (err) {
    if (err instanceof AiGenerationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong generating the packing list." }, { status: 500 });
  }
}
