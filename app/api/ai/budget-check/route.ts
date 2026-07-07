import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateStructured, AiGenerationError } from "@/lib/ai/client";

export const maxDuration = 30;

const ResponseSchema = z.object({
  summary: z.string().describe("One sentence overall assessment, framed as a helpful heads-up, not a verdict"),
  flags: z
    .array(
      z.object({
        severity: z.enum(["info", "warning"]),
        message: z.string().describe("A specific, helpful observation — framed as a flag to double check, not a definitive judgment"),
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

  const [{ data: members }, { data: flights }, { data: lodging }, { data: itineraryItems }] = await Promise.all([
    supabase.from("trip_members").select("user_id, display_name, profiles(name)").eq("trip_id", tripId),
    supabase.from("flights").select("user_id, price, status").eq("trip_id", tripId),
    supabase.from("lodging_options").select("name, price_per_night, status").eq("trip_id", tripId),
    supabase.from("itinerary_items").select("title, cost").eq("trip_id", tripId).not("cost", "is", null),
  ]);

  const nameByUser = new Map(
    (members ?? []).map((m) => [m.user_id, (m as unknown as { profiles?: { name: string } | null }).profiles?.name ?? m.display_name]),
  );

  const flightLines = (flights ?? [])
    .filter((f) => f.price !== null)
    .map((f) => `${nameByUser.get(f.user_id) ?? "A member"}: $${f.price} (${f.status})`);

  const bookedLodging = (lodging ?? []).filter((l) => l.status === "booked" && l.price_per_night !== null);
  const lodgingLines = bookedLodging.map((l) => `${l.name}: $${l.price_per_night}/night`);

  const itineraryLines = (itineraryItems ?? []).map((i) => `${i.title}: $${i.cost}`);

  if (flightLines.length === 0 && lodgingLines.length === 0 && itineraryLines.length === 0) {
    return NextResponse.json({ summary: "Not enough budget data yet to check.", flags: [] });
  }

  const prompt = `Trip: ${trip.name}
Destination: ${trip.destination ?? "unspecified"}
Dates: ${trip.start_date ?? "not set"} to ${trip.end_date ?? "not set"}

Flight prices per member:
${flightLines.length > 0 ? flightLines.join("\n") : "None entered yet."}

Booked lodging (per night):
${lodgingLines.length > 0 ? lodgingLines.join("\n") : "None booked yet."}

Itinerary items with a cost:
${itineraryLines.length > 0 ? itineraryLines.join("\n") : "None."}

Review this budget breakdown for anything that looks unusual and worth a second look — for example one person's
flight priced way above the group average, a lodging cost per night that seems high or low for the destination,
or an itinerary cost that stands out. Only flag genuinely notable things; if everything looks reasonable, return
zero flags. Frame every flag as a friendly heads-up for the group to double check, never as a definitive
judgment — you don't know their full context (points redemptions, different departure cities, etc).`;

  try {
    const result = await generateStructured({
      system:
        "You are a helpful budget-review assistant for a group trip. You flag things worth double-checking, you never make definitive claims about someone's spending being wrong — you don't have full context on why a price might differ (loyalty redemptions, different home airports, etc).",
      prompt,
      schema: ResponseSchema,
      maxTokens: 1024,
    });

    const { data: inserted, error } = await supabase
      .from("ai_suggestions")
      .insert({
        trip_id: tripId,
        type: "budget",
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
    return NextResponse.json({ error: "Something went wrong checking the budget." }, { status: 500 });
  }
}
