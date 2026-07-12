import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateStructured, AiGenerationError } from "@/lib/ai/client";

export const maxDuration = 30;

const ResponseSchema = z.object({
  suggestions: z
    .array(
      z.object({
        name: z.string(),
        cuisine: z.string(),
        location: z.string().describe("A concise street address or neighborhood in the destination"),
        notes: z.string().describe("One or two sentences on why it's recommended"),
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

  const { data: trip } = await supabase.from("trips").select("name, destination").eq("id", tripId).single();
  if (!trip) return NextResponse.json({ error: "Trip not found, or you're not a member" }, { status: 404 });

  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("name, cuisine, restaurant_votes(user_id)")
    .eq("trip_id", tripId);

  const existingNames = (restaurants ?? []).map((r) => r.name);
  const cuisineCounts = new Map<string, number>();
  for (const r of restaurants ?? []) {
    if (!r.cuisine) continue;
    const votes = ((r as unknown as { restaurant_votes: { user_id: string }[] }).restaurant_votes ?? []).length;
    cuisineCounts.set(r.cuisine, (cuisineCounts.get(r.cuisine) ?? 0) + 1 + votes);
  }
  const topCuisines = [...cuisineCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cuisine]) => cuisine);

  const prompt = `Trip: ${trip.name}
Destination: ${trip.destination ?? "unspecified"}

Cuisines the group has already shown interest in (most upvoted first): ${topCuisines.length > 0 ? topCuisines.join(", ") : "none yet"}
Restaurants already on the list (don't repeat these): ${existingNames.length > 0 ? existingNames.join(", ") : "none yet"}

Suggest up to 5 restaurants or food experiences in the destination worth trying. Include a useful location
(street address when confident, otherwise the neighborhood). Weight toward the group's
already-shown cuisine preferences when there are any, but also include at least one or two different ideas so
the list doesn't feel repetitive. Prefer specific, real, well-known places over generic filler.`;

  try {
    const result = await generateStructured({
      system:
        "You are a well-traveled local food recommender helping a group of friends pick restaurants for a shared trip. Be concrete and specific to the destination. Never invent a specific restaurant you're not reasonably confident is real.",
      prompt,
      schema: ResponseSchema,
      maxTokens: 1536,
    });

    if (result.suggestions.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    const { data: inserted, error } = await supabase
      .from("ai_suggestions")
      .insert(
        result.suggestions.map((s) => ({
          trip_id: tripId,
          type: "restaurant" as const,
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
