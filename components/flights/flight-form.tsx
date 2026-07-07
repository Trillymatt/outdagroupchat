"use client";

import { useState } from "react";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Flight } from "@/lib/types/trip";

export interface FlightFormValues {
  airline: string;
  flight_number: string;
  price: string;
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  booking_link: string;
  notes: string;
}

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function flightToFormValues(flight?: Flight | null): FlightFormValues {
  return {
    airline: flight?.airline ?? "",
    flight_number: flight?.flight_number ?? "",
    price: flight?.price != null ? String(flight.price) : "",
    departure_airport: flight?.departure_airport ?? "",
    arrival_airport: flight?.arrival_airport ?? "",
    departure_time: toLocalInputValue(flight?.departure_time ?? null),
    arrival_time: toLocalInputValue(flight?.arrival_time ?? null),
    booking_link: flight?.booking_link ?? "",
    notes: flight?.notes ?? "",
  };
}

export function FlightForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: FlightFormValues;
  onCancel?: () => void;
  onSubmit: (values: FlightFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<FlightFormValues>(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onSubmit(values);
    } catch {
      setError("Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="flight-airline">Airline</Label>
          <Input id="flight-airline" value={values.airline} onChange={(e) => setValues((v) => ({ ...v, airline: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="flight-number">Flight number</Label>
          <Input
            id="flight-number"
            value={values.flight_number}
            onChange={(e) => setValues((v) => ({ ...v, flight_number: e.target.value }))}
            placeholder="AA123"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="flight-dep-airport">From</Label>
          <Input
            id="flight-dep-airport"
            value={values.departure_airport}
            onChange={(e) => setValues((v) => ({ ...v, departure_airport: e.target.value }))}
            placeholder="JFK"
          />
        </div>
        <div>
          <Label htmlFor="flight-arr-airport">To</Label>
          <Input
            id="flight-arr-airport"
            value={values.arrival_airport}
            onChange={(e) => setValues((v) => ({ ...v, arrival_airport: e.target.value }))}
            placeholder="LIS"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="flight-dep-time">Departs</Label>
          <Input
            id="flight-dep-time"
            type="datetime-local"
            value={values.departure_time}
            onChange={(e) => setValues((v) => ({ ...v, departure_time: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="flight-arr-time">Arrives</Label>
          <Input
            id="flight-arr-time"
            type="datetime-local"
            value={values.arrival_time}
            onChange={(e) => setValues((v) => ({ ...v, arrival_time: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="flight-price">Price</Label>
          <Input
            id="flight-price"
            type="number"
            step="0.01"
            min="0"
            value={values.price}
            onChange={(e) => setValues((v) => ({ ...v, price: e.target.value }))}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="flight-link">Booking link</Label>
          <Input
            id="flight-link"
            type="url"
            value={values.booking_link}
            onChange={(e) => setValues((v) => ({ ...v, booking_link: e.target.value }))}
            placeholder="https://..."
          />
        </div>
      </div>
      <div>
        <Label htmlFor="flight-notes">Notes</Label>
        <Input id="flight-notes" value={values.notes} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} />
      </div>
      <FieldError>{error}</FieldError>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
