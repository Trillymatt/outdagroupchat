"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeList } from "@/lib/hooks/use-realtime-list";
import { EmptyState } from "@/components/ui/empty-state";
import { FlightSearchForm, type FlightSearchParams } from "@/components/flights/flight-search-form";
import { FlightSearchResults } from "@/components/flights/flight-search-results";
import { FlightSuggestionCard } from "@/components/flights/flight-suggestion-card";
import type { FlightSearchResult } from "@/lib/flights/amadeus-client";
import type { FlightSuggestion } from "@/lib/types/trip";

export function FlightSuggestionsClient({
  tripId,
  currentUserId,
  canEditOthers,
  initialSuggestions,
  memberLookup,
  startDate,
  endDate,
}: {
  tripId: string;
  currentUserId: string;
  canEditOthers: boolean;
  initialSuggestions: FlightSuggestion[];
  memberLookup: Map<string, { name: string; color?: string }>;
  startDate: string | null;
  endDate: string | null;
}) {
  const [suggestions, setSuggestions] = useRealtimeList<FlightSuggestion>("flight_suggestions", tripId, initialSuggestions);

  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<FlightSearchResult[]>([]);
  const [lastParams, setLastParams] = useState<FlightSearchParams | null>(null);

  async function handleSearch(params: FlightSearchParams) {
    setSearching(true);
    setSearchError(null);
    setLastParams(params);
    try {
      const res = await fetch("/api/flights/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, ...params }),
      });
      const body = await res.json();
      if (!res.ok) {
        setSearchError(body.error ?? "Something went wrong searching for flights.");
        setResults([]);
      } else {
        setResults(body.results ?? []);
      }
    } catch {
      setSearchError("Could not reach the search service — try again.");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleSuggest(result: FlightSearchResult, bookingLink: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("flight_suggestions")
      .insert({
        trip_id: tripId,
        airline: result.airline,
        flight_number: result.flightNumber,
        price: result.price,
        departure_airport: result.departureAirport,
        arrival_airport: result.arrivalAirport,
        departure_time: result.departureTime,
        arrival_time: result.arrivalTime,
        nonstop: result.nonstop,
        booking_link: bookingLink,
        created_by: currentUserId,
      })
      .select()
      .single();

    if (!error && data) {
      setSuggestions((prev) => (prev.some((s) => s.id === data.id) ? prev : [...prev, data]));
    }
  }

  async function toggleBooked(option: FlightSuggestion) {
    const supabase = createClient();
    const nextStatus = option.status === "booked" ? "proposed" : "booked";
    setSuggestions((prev) => prev.map((s) => (s.id === option.id ? { ...s, status: nextStatus } : s)));
    await supabase.from("flight_suggestions").update({ status: nextStatus }).eq("id", option.id);
  }

  async function handleDelete(suggestionId: string) {
    if (!confirm("Remove this flight suggestion?")) return;
    const supabase = createClient();
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
    await supabase.from("flight_suggestions").delete().eq("id", suggestionId);
  }

  return (
    <div className="space-y-6">
      <FlightSearchForm startDate={startDate} endDate={endDate} loading={searching} onSearch={handleSearch} />

      {(searching || searchError || results.length > 0) && lastParams && (
        <FlightSearchResults
          results={results}
          loading={searching}
          error={searchError}
          origin={lastParams.origin}
          destination={lastParams.destination}
          departDate={lastParams.departDate}
          returnDate={lastParams.returnDate}
          onSuggest={handleSuggest}
        />
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Suggested to the group</h3>
        {suggestions.length === 0 ? (
          <EmptyState title="No flights suggested yet" description="Search above and suggest an option to share with the group." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <AnimatePresence initial={false}>
              {suggestions.map((option) => (
                <FlightSuggestionCard
                  key={option.id}
                  option={option}
                  authorName={memberLookup.get(option.created_by)?.name}
                  canEdit={option.created_by === currentUserId || canEditOthers}
                  onToggleBooked={() => toggleBooked(option)}
                  onDelete={() => handleDelete(option.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
