"use client";

import { ExternalLink, Plane } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildGoogleFlightsSearchUrl } from "@/lib/utils/google-flights";
import type { FlightSearchResult } from "@/lib/flights/amadeus-client";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function FlightSearchResults({
  results,
  loading,
  error,
  origin,
  destination,
  departDate,
  returnDate,
  onSuggest,
}: {
  results: FlightSearchResult[];
  loading: boolean;
  error: string | null;
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  onSuggest: (result: FlightSearchResult, bookingLink: string) => void;
}) {
  if (!loading && !error && results.length === 0) return null;

  const googleFlightsLink = origin && destination ? buildGoogleFlightsSearchUrl(origin, destination, departDate, returnDate) : null;

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
          {loading ? "Searching…" : `${results.length} result${results.length === 1 ? "" : "s"}`}
        </h3>
        {googleFlightsLink && (
          <a
            href={googleFlightsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-green-dark hover:underline"
          >
            <Plane className="h-3 w-3" />
            View on Google Flights <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="space-y-2">
        {results.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-3.5 py-2.5">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-ink">
                  {r.airline} {r.flightNumber}
                </p>
                <Badge tone={r.nonstop ? "success" : "neutral"}>{r.nonstop ? "Nonstop" : `${r.stops} stop${r.stops === 1 ? "" : "s"}`}</Badge>
              </div>
              <p className="text-xs text-ink-soft">
                {r.departureAirport} {formatTime(r.departureTime)} → {r.arrivalAirport} {formatTime(r.arrivalTime)} · {formatDuration(r.durationMinutes)}
              </p>
              {r.returnDepartureTime && <p className="text-xs text-ink-soft">Returns {formatTime(r.returnDepartureTime)}</p>}
            </div>
            <div className="flex items-center gap-3">
              <p className="font-semibold text-ink">{currency.format(r.price)}</p>
              <Button
                size="sm"
                onClick={() => onSuggest(r, buildGoogleFlightsSearchUrl(r.departureAirport, r.arrivalAirport, r.departureTime.slice(0, 10), r.returnDepartureTime?.slice(0, 10)))}
              >
                Suggest to group
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
