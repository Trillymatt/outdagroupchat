import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchCityPhoto, trackDownload } from "@/lib/images/unsplash-client";

export const maxDuration = 15;

// Callers always intend to use the result immediately (set as a cover image),
// so the Unsplash download-tracking ping happens here rather than asking
// client code to make a second authenticated call.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "q is required" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const photo = await searchCityPhoto(q);
  if (photo) void trackDownload(photo.downloadLocation);
  return NextResponse.json({ url: photo?.url ?? null }, { headers: { "Cache-Control": "private, max-age=3600" } });
}
