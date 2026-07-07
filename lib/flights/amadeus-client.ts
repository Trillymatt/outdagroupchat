// Thin wrapper around Amadeus's Self-Service "test" environment: an OAuth2
// client-credentials token (cached in memory, refreshed on expiry) plus the
// Flight Offers Search endpoint, normalized into shapes the UI can render
// directly. Mirrors lib/ai/client.ts's role/error-class shape for consistency.

const AMADEUS_BASE_URL = "https://test.api.amadeus.com";

export class AmadeusError extends Error {
  status: number;
  retryable: boolean;

  constructor(message: string, status: number, retryable: boolean) {
    super(message);
    this.name = "AmadeusError";
    this.status = status;
    this.retryable = retryable;
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new AmadeusError("Flight search isn't configured yet — missing Amadeus API credentials.", 503, false);
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  let response: Response;
  try {
    response = await fetch(`${AMADEUS_BASE_URL}/v1/security/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
    });
  } catch {
    throw new AmadeusError("Could not reach the flight search provider — try again.", 503, true);
  }

  if (!response.ok) {
    throw new AmadeusError("Flight search provider rejected our credentials — check the Amadeus API keys.", 502, false);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

function parseIsoDurationMinutes(duration: string): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(duration);
  if (!match) return 0;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  return hours * 60 + minutes;
}

export interface FlightSearchResult {
  id: string;
  airline: string;
  flightNumber: string;
  price: number;
  currency: string;
  nonstop: boolean;
  stops: number;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  returnDepartureTime: string | null;
  returnArrivalTime: string | null;
}

interface AmadeusSegment {
  departure: { iataCode: string; at: string };
  arrival: { iataCode: string; at: string };
  carrierCode: string;
  number: string;
}

interface AmadeusOffer {
  id: string;
  validatingAirlineCodes?: string[];
  price: { total: string; currency: string };
  itineraries: { duration: string; segments: AmadeusSegment[] }[];
}

export async function searchFlights({
  origin,
  destination,
  departDate,
  returnDate,
  nonstopOnly,
}: {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  nonstopOnly: boolean;
}): Promise<FlightSearchResult[]> {
  const token = await getAccessToken();

  const params = new URLSearchParams({
    originLocationCode: origin.toUpperCase(),
    destinationLocationCode: destination.toUpperCase(),
    departureDate: departDate,
    adults: "1",
    currencyCode: "USD",
    max: "20",
  });
  if (returnDate) params.set("returnDate", returnDate);
  if (nonstopOnly) params.set("nonStop", "true");

  let response: Response;
  try {
    response = await fetch(`${AMADEUS_BASE_URL}/v2/shopping/flight-offers?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new AmadeusError("Could not reach the flight search provider — try again.", 503, true);
  }

  if (!response.ok) {
    const retryable = response.status >= 500;
    throw new AmadeusError(
      response.status === 400 ? "Check the airport codes and dates and try again." : "Flight search failed — try again.",
      response.status,
      retryable,
    );
  }

  const body = (await response.json()) as { data?: AmadeusOffer[] };

  return (body.data ?? []).map((offer) => {
    const outbound = offer.itineraries[0];
    const inbound = offer.itineraries[1];
    const firstSegment = outbound.segments[0];
    const lastSegment = outbound.segments[outbound.segments.length - 1];

    return {
      id: offer.id,
      airline: offer.validatingAirlineCodes?.[0] ?? firstSegment.carrierCode,
      flightNumber: `${firstSegment.carrierCode}${firstSegment.number}`,
      price: Number(offer.price.total),
      currency: offer.price.currency,
      nonstop: outbound.segments.length === 1,
      stops: outbound.segments.length - 1,
      departureAirport: firstSegment.departure.iataCode,
      arrivalAirport: lastSegment.arrival.iataCode,
      departureTime: firstSegment.departure.at,
      arrivalTime: lastSegment.arrival.at,
      durationMinutes: parseIsoDurationMinutes(outbound.duration),
      returnDepartureTime: inbound?.segments[0]?.departure.at ?? null,
      returnArrivalTime: inbound?.segments[inbound.segments.length - 1]?.arrival.at ?? null,
    };
  });
}
