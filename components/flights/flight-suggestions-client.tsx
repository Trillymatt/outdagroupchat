"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeList, useRealtimeJoinList } from "@/lib/hooks/use-realtime-list";
import { EmptyState } from "@/components/ui/empty-state";
import { FlightSearchForm, type FlightSearchParams } from "@/components/flights/flight-search-form";
import { FlightSearchResults } from "@/components/flights/flight-search-results";
import { FlightSuggestionCard } from "@/components/flights/flight-suggestion-card";
import type { FlightSearchResult } from "@/lib/flights/amadeus-client";
import type { FlightSuggestion } from "@/lib/types/trip";

interface FlightSuggestionVoteRow {
  flight_suggestion_id: string;
  user_id: string;
  trip_id: string;
  created_at: string;
}

export function FlightSuggestionsClient({
  tripId,
  currentUserId,
  canEditOthers,
  initialSuggestions,
  initialVotes,
  memberLookup,
  startDate,
  endDate,
}: {
  tripId: string;
  currentUserId: string;
  canEditOthers: boolean;
  initialSuggestions: FlightSuggestion[];
  initialVotes: FlightSuggestionVoteRow[];
  memberLookup: Map<string, { name: string; color?: string }>;
  startDate: string | null;
  endDate: string | null;
}) {
  const [suggestions, setSuggestions] = useRealtimeList<FlightSuggestion>("flight_suggestions", tripId, initialSuggestions);
  const [votes, setVotes] = useRealtimeJoinList<FlightSuggestionVoteRow>(
    "flight_suggestion_votes",
    tripId,
    initialVotes,
    (v) => `${v.flight_suggestion_id}:${v.user_id}`,
  );

  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<FlightSearchResult[]>([]);
  const [lastParams, setLastParams] = useState<FlightSearchParams | null>(null);

  const votesBySuggestion = useMemo(() => {
    const map = new Map<string, FlightSuggestionVoteRow[]>();
    for (const v of votes) map.set(v.flight_suggestion_id, [...(map.get(v.flight_suggestion_id) ?? []), v]);
    return map;
  }, [votes]);

  const sorted = useMemo(
    () => [...suggestions].sort((a, b) => (votesBySuggestion.get(b.id)?.length ?? 0) - (votesBySuggestion.get(a.id)?.length ?? 0)),
    [suggestions, votesBySuggestion],
  );

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

  async function toggleVote(suggestionId: string) {
    const supabase = createClient();
    const mine = votes.some((v) => v.flight_suggestion_id === suggestionId && v.user_id === currentUserId);
    if (mine) {
      setVotes((prev) => prev.filter((v) => !(v.flight_suggestion_id === suggestionId && v.user_id === currentUserId)));
      await supabase.from("flight_suggestion_votes").delete().eq("flight_suggestion_id", suggestionId).eq("user_id", currentUserId);
    } else {
      setVotes((prev) => [
        ...prev,
        { flight_suggestion_id: suggestionId, user_id: currentUserId, trip_id: tripId, created_at: new Date().toISOString() },
      ]);
      await supabase.from("flight_suggestion_votes").insert({ flight_suggestion_id: suggestionId, user_id: currentUserId, trip_id: tripId });
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
        {sorted.length === 0 ? (
          <EmptyState title="No flights suggested yet" description="Search above and suggest an option for the group to vote on." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <AnimatePresence initial={false}>
              {sorted.map((option) => {
                const optionVotes = votesBySuggestion.get(option.id) ?? [];
                return (
                  <FlightSuggestionCard
                    key={option.id}
                    option={option}
                    voteCount={optionVotes.length}
                    votedByMe={optionVotes.some((v) => v.user_id === currentUserId)}
                    voters={optionVotes.map((v) => memberLookup.get(v.user_id) ?? { name: "Someone" })}
                    authorName={memberLookup.get(option.created_by)?.name}
                    canEdit={option.created_by === currentUserId || canEditOthers}
                    onToggleVote={() => toggleVote(option.id)}
                    onToggleBooked={() => toggleBooked(option)}
                    onDelete={() => handleDelete(option.id)}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
