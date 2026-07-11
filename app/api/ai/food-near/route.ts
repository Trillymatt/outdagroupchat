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
        notes: z.string().describe("One or two sentences on why it's recommended, including roughly how close it is to the anchor point"),
      }),
    )
    .max(6),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const tripId = body?.tripId;
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  const label = typeof body?.label === "string" ? body.label : null;
  if (typeof tripId !== "string" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "tripId, lat, and lng are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: trip } = await supabase.from("trips").select("name, destination").eq("id", tripId).single();
  if (!trip) return NextResponse.json({ error: "Trip not found, or you're not a member" }, { status: 404 });

  const { data: restaurants } = await supabase.from("restaurants").select("name").eq("trip_id", tripId);
  const existingNames = (restaurants ?? []).map((r) => r.name);

  const prompt = `Trip: ${trip.name}
Destination: ${trip.destination ?? "unspecified"}

Anchor point: ${label ?? "a specific spot on the trip"}, at coordinates (${lat}, ${lng})
Restaurants already on the list (don't repeat these): ${existingNames.length > 0 ? existingNames.join(", ") : "none yet"}

Suggest up to 5 real, well-known restaurants or food spots within easy walking or short transit distance of the
anchor point above. Prefer places you're reasonably confident actually exist near those coordinates over generic
filler — if you're not confident of specific nearby places, suggest fewer rather than inventing ones.`;

  try {
    const result = await generateStructured({
      system:
        "You are a well-traveled local food recommender helping a group of friends find places to eat near a specific location on their trip. Be concrete and specific. Never invent a specific restaurant you're not reasonably confident is real and near the given coordinates.",
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
          content: { ...s, nearLabel: label, nearLat: lat, nearLng: lng },
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
