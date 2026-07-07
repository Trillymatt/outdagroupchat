"use client";

import { useState } from "react";
import { addDays, format, subDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departDate: string;
  returnDate: string;
  nonstopOnly: boolean;
}

function defaultDates(startDate: string | null, endDate: string | null): { depart: string; ret: string } {
  if (startDate && endDate) {
    return { depart: format(subDays(new Date(`${startDate}T00:00:00`), 2), "yyyy-MM-dd"), ret: format(addDays(new Date(`${endDate}T00:00:00`), 2), "yyyy-MM-dd") };
  }
  const today = new Date();
  return { depart: format(today, "yyyy-MM-dd"), ret: format(addDays(today, 7), "yyyy-MM-dd") };
}

export function FlightSearchForm({
  startDate,
  endDate,
  loading,
  onSearch,
}: {
  startDate: string | null;
  endDate: string | null;
  loading: boolean;
  onSearch: (params: FlightSearchParams) => void;
}) {
  const defaults = defaultDates(startDate, endDate);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departDate, setDepartDate] = useState(defaults.depart);
  const [returnDate, setReturnDate] = useState(defaults.ret);
  const [nonstopOnly, setNonstopOnly] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (origin.trim().length !== 3 || destination.trim().length !== 3) {
      setError("Enter 3-letter airport codes, e.g. JFK");
      return;
    }
    setError("");
    onSearch({ origin: origin.trim().toUpperCase(), destination: destination.trim().toUpperCase(), departDate, returnDate, nonstopOnly });
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold text-ink">Search flights</h2>
        <p className="text-sm text-ink-soft">Search real routes around your trip dates and suggest the best ones to the group.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="search-origin">From (airport code)</Label>
            <Input id="search-origin" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="JFK" maxLength={3} />
          </div>
          <div>
            <Label htmlFor="search-destination">To (airport code)</Label>
            <Input id="search-destination" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="LIS" maxLength={3} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="search-depart">Depart</Label>
            <Input id="search-depart" type="date" value={departDate} onChange={(e) => setDepartDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="search-return">Return (optional)</Label>
            <Input id="search-return" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={nonstopOnly} onChange={(e) => setNonstopOnly(e.target.checked)} className="h-4 w-4 rounded accent-green" />
          Nonstop only
        </label>
        <FieldError>{error}</FieldError>
        <Button type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search flights"}
        </Button>
      </form>
    </Card>
  );
}
