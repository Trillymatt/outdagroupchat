import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateRange } from "@/lib/utils/dates";

export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }): Promise<Metadata> {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase.rpc("get_public_profile", { p_user_id: userId }).single();
  return { title: profile ? `${profile.name} — Tandem` : "Profile — Tandem" };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const supabase = await createClient();

  const [{ data: profile }, { data: trips }] = await Promise.all([
    supabase.rpc("get_public_profile", { p_user_id: userId }).single(),
    supabase.rpc("get_public_completed_trips", { p_user_id: userId }),
  ]);

  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="flex items-center gap-4">
        <Avatar name={profile.name} color={profile.avatar_color} avatarUrl={profile.avatar_url} size={64} />
        <div>
          <h1 className="text-xl font-semibold text-ink">{profile.name}</h1>
          <p className="text-sm text-ink-soft">Trip history</p>
        </div>
      </Card>

      {!trips || trips.length === 0 ? (
        <EmptyState title="No completed trips yet" description="Trips this person has marked as completed will show up here." />
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <Card key={trip.id} className="flex items-center gap-4">
              {trip.cover_image && (
                // eslint-disable-next-line @next/next/no-img-element -- remote Unsplash/Storage URL, no next/image domain config needed
                <img src={trip.cover_image} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{trip.name}</p>
                {trip.destination && (
                  <p className="flex items-center gap-1 text-sm text-ink-soft">
                    <MapPin className="h-3.5 w-3.5" />
                    {trip.destination}
                  </p>
                )}
                <p className="text-xs text-ink-soft">{formatDateRange(trip.start_date, trip.end_date)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
