// Thin wrapper around Unsplash's Search Photos API for auto-suggesting a
// trip/city cover photo. Mirrors lib/flights/amadeus-client.ts's error-class
// shape for consistency.

const UNSPLASH_BASE_URL = "https://api.unsplash.com";

export class UnsplashError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "UnsplashError";
    this.status = status;
  }
}

export interface CityPhoto {
  url: string;
  attributionName: string;
  attributionUrl: string;
  /** Ping this (per Unsplash API guidelines) once the photo is actually used, not just previewed. */
  downloadLocation: string;
}

/** Best-effort photo search for a place name. Returns null on any failure — callers should never block on this. */
export async function searchCityPhoto(query: string): Promise<CityPhoto | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey || !query.trim()) return null;

  try {
    const url = new URL(`${UNSPLASH_BASE_URL}/search/photos`);
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "1");
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("content_filter", "high");

    const response = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;

    const data = await response.json();
    const photo = data.results?.[0];
    if (!photo) return null;

    return {
      url: photo.urls.regular as string,
      attributionName: photo.user?.name ?? "Unsplash",
      attributionUrl: `${photo.user?.links?.html ?? "https://unsplash.com"}?utm_source=tandem&utm_medium=referral`,
      downloadLocation: photo.links?.download_location as string,
    };
  } catch {
    return null;
  }
}

/** Unsplash requires pinging this when a suggested photo is actually applied, not merely previewed. */
export async function trackDownload(downloadLocation: string): Promise<void> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey || !downloadLocation) return;
  try {
    await fetch(downloadLocation, { headers: { Authorization: `Client-ID ${accessKey}` }, signal: AbortSignal.timeout(5_000) });
  } catch {
    // best-effort tracking ping; never block the caller on this
  }
}
