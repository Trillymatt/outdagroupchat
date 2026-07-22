// Common IATA airline codes → names, so entering a flight number like "AA123"
// can prefill the airline without any external API. Not exhaustive — just the
// carriers a group trip is most likely to book. Unknown codes are left blank.
const AIRLINE_CODES: Record<string, string> = {
  AA: "American Airlines",
  AC: "Air Canada",
  AF: "Air France",
  AM: "Aeroméxico",
  AS: "Alaska Airlines",
  AV: "Avianca",
  AY: "Finnair",
  AZ: "ITA Airways",
  B6: "JetBlue",
  BA: "British Airways",
  CM: "Copa Airlines",
  CX: "Cathay Pacific",
  DL: "Delta Air Lines",
  EI: "Aer Lingus",
  EK: "Emirates",
  ET: "Ethiopian Airlines",
  EY: "Etihad Airways",
  F9: "Frontier Airlines",
  FI: "Icelandair",
  FR: "Ryanair",
  G4: "Allegiant Air",
  GA: "Garuda Indonesia",
  IB: "Iberia",
  JL: "Japan Airlines",
  KE: "Korean Air",
  KL: "KLM",
  LA: "LATAM",
  LH: "Lufthansa",
  LX: "SWISS",
  NH: "ANA",
  NK: "Spirit Airlines",
  OS: "Austrian Airlines",
  QF: "Qantas",
  QR: "Qatar Airways",
  SK: "SAS",
  SQ: "Singapore Airlines",
  SN: "Brussels Airlines",
  TK: "Turkish Airlines",
  TP: "TAP Air Portugal",
  UA: "United Airlines",
  UX: "Air Europa",
  VA: "Virgin Australia",
  VS: "Virgin Atlantic",
  VY: "Vueling",
  WN: "Southwest Airlines",
  WS: "WestJet",
};

/** Split "aa 123" / "AA123" into a 2-character carrier code and the number. */
export function parseFlightNumber(raw: string): { carrierCode: string; number: string } | null {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, "");
  const match = /^([A-Z0-9]{2})(\d{1,4})$/.exec(cleaned);
  if (!match) return null;
  return { carrierCode: match[1], number: match[2] };
}

/** Best-effort airline name for a flight number, or null if the code isn't known. */
export function airlineFromFlightNumber(raw: string): string | null {
  const parsed = parseFlightNumber(raw);
  if (!parsed) return null;
  return AIRLINE_CODES[parsed.carrierCode] ?? null;
}

/**
 * A Google search URL for a flight number that surfaces Google's live flight
 * card (route, scheduled times, terminal, status) — no API key required.
 */
export function flightLookupUrl(flightNumber: string, date?: string | null): string {
  const parsed = parseFlightNumber(flightNumber);
  const query = parsed ? `${parsed.carrierCode} ${parsed.number} flight${date ? ` ${date}` : ""}` : `${flightNumber} flight`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
