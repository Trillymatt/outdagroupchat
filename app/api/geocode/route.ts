import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 15;

const cache = new Map<string, { lat: number; lng: number } | null>();
const MAX_CACHE_ENTRIES = 1000;

// Nominatim asks for max 1 req/s per app — serialize requests through this promise chain
let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const wait = Math.max(0, lastRequestAt + 1100 - Date.now());
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Tandem trip planner (contact: admin@tandem.app)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const results = (await res.json()) as { lat: string; lon: string }[];
  if (!Array.isArray(results) || results.length === 0) return null;
  const lat = Number(results[0].lat);
  const lng = Number(results[0].lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "q is required" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const key = q.toLowerCase();
  if (cache.has(key)) {
    return NextResponse.json(cache.get(key) ?? { lat: null, lng: null });
  }

  const result = await (queue = queue.then(() => geocode(q).catch(() => null)));
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, result as { lat: number; lng: number } | null);

  return NextResponse.json((result as { lat: number; lng: number } | null) ?? { lat: null, lng: null }, {
    headers: { "Cache-Control": "private, max-age=86400" },
  });
}
