export function buildGoogleFlightsUrl(destination: string | null, startDate: string | null, endDate: string | null): string {
  let query = "Flights";
  if (destination) query += ` to ${destination}`;
  if (startDate) query += ` on ${startDate}`;
  if (endDate) query += ` through ${endDate}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
}

export function buildGoogleFlightsSearchUrl(origin: string, destination: string, departDate: string, returnDate?: string | null): string {
  let query = `Flights from ${origin} to ${destination} on ${departDate}`;
  if (returnDate) query += ` returning ${returnDate}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
}
