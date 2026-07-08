import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { computeBudget } from "@/lib/budget/compute";
import { TripPdf, type TripPdfData } from "@/lib/pdf/trip-pdf";

export const maxDuration = 30;

export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: trip } = await supabase.from("trips").select("name, destination, start_date, end_date").eq("id", tripId).single();
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const [
    { data: members },
    { data: flights },
    { data: lodging },
    { data: lodgingVotes },
    { data: items },
    { data: restaurants },
    { data: restaurantVotes },
    { data: documents },
  ] = await Promise.all([
    supabase.from("trip_members").select("user_id, display_name, profiles(name)").eq("trip_id", tripId),
    supabase.from("flights").select("*").eq("trip_id", tripId),
    supabase.from("lodging_options").select("*").eq("trip_id", tripId),
    supabase.from("lodging_votes").select("lodging_option_id").eq("trip_id", tripId),
    supabase.from("itinerary_items").select("*").eq("trip_id", tripId).order("day").order("position"),
    supabase.from("restaurants").select("*").eq("trip_id", tripId),
    supabase.from("restaurant_votes").select("restaurant_id").eq("trip_id", tripId),
    supabase.from("trip_documents").select("name, uploaded_by").eq("trip_id", tripId).order("created_at"),
  ]);

  const nameOf = new Map(
    (members ?? []).map((m) => {
      const profile = (m as unknown as { profiles: { name: string } | null }).profiles;
      return [m.user_id, profile?.name ?? m.display_name];
    }),
  );

  const nights =
    trip.start_date && trip.end_date
      ? Math.max(1, Math.round((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86_400_000))
      : null;

  const lodgingVoteCount = new Map<string, number>();
  for (const v of lodgingVotes ?? []) {
    lodgingVoteCount.set(v.lodging_option_id, (lodgingVoteCount.get(v.lodging_option_id) ?? 0) + 1);
  }
  const restaurantVoteCount = new Map<string, number>();
  for (const v of restaurantVotes ?? []) {
    restaurantVoteCount.set(v.restaurant_id, (restaurantVoteCount.get(v.restaurant_id) ?? 0) + 1);
  }

  const dayMap = new Map<string, TripPdfData["itineraryByDay"][number]["items"]>();
  for (const item of items ?? []) {
    if (!dayMap.has(item.day)) dayMap.set(item.day, []);
    dayMap.get(item.day)!.push({
      time: item.time,
      title: item.title,
      category: item.category,
      location: item.location,
      cost: item.cost,
      description: item.description,
    });
  }

  const budget = computeBudget(
    (members ?? []).map((m) => ({ userId: m.user_id, name: nameOf.get(m.user_id) ?? m.display_name })),
    (flights ?? []).map((f) => ({ userId: f.user_id, price: f.price, status: f.status })),
    (lodging ?? []).map((l) => ({ pricePerNight: l.price_per_night, status: l.status })),
    (items ?? []).map((i) => ({ cost: i.cost })),
    nights,
  );

  const data: TripPdfData = {
    trip,
    members: (members ?? []).map((m) => ({ name: nameOf.get(m.user_id) ?? m.display_name })),
    flights: (flights ?? [])
      .filter((f) => f.status !== "opted_out")
      .map((f) => ({
        memberName: nameOf.get(f.user_id) ?? "Member",
        airline: f.airline,
        flight_number: f.flight_number,
        departure_airport: f.departure_airport,
        arrival_airport: f.arrival_airport,
        departure_time: f.departure_time,
        arrival_time: f.arrival_time,
        price: f.price,
        status: f.status,
      })),
    lodging: (lodging ?? []).map((l) => ({
      name: l.name,
      url: l.url,
      price_per_night: l.price_per_night,
      notes: l.notes,
      status: l.status,
      votes: lodgingVoteCount.get(l.id) ?? 0,
    })),
    itineraryByDay: Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, dayItems]) => ({ day, items: dayItems })),
    restaurants: (restaurants ?? [])
      .map((r) => ({ name: r.name, cuisine: r.cuisine, url: r.url, votes: restaurantVoteCount.get(r.id) ?? 0 }))
      .sort((a, b) => b.votes - a.votes),
    documents: (documents ?? []).map((d) => ({ name: d.name, uploaderName: nameOf.get(d.uploaded_by) ?? "Someone" })),
    budget,
    nights,
  };

  // TripPdf renders a react-pdf <Document> at its root; the cast tells renderToBuffer so
  const buffer = await renderToBuffer(createElement(TripPdf, { data }) as unknown as React.ReactElement<DocumentProps>);

  const slug = trip.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "trip";
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}-trip-summary.pdf"`,
    },
  });
}
