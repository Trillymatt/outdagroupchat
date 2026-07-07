import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TripHeader, type TripHeaderData } from "@/components/trips/trip-header";
import { TripTabsNav } from "@/components/trips/trip-tabs-nav";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: trip } = await supabase
    .from("trips")
    .select("name, destination, start_date, end_date, trip_members(display_name, profiles(name, avatar_color))")
    .eq("id", tripId)
    .single();

  if (!trip) notFound();

  return (
    <div className="space-y-6">
      <TripHeader trip={trip as unknown as TripHeaderData} />
      <TripTabsNav tripId={tripId} />
      <div>{children}</div>
    </div>
  );
}
