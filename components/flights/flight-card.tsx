"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, ExternalLink, Pencil, Plane } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { FlightForm, flightToFormValues, type FlightFormValues } from "@/components/flights/flight-form";
import { buildGoogleFlightsUrl } from "@/lib/utils/google-flights";
import type { Flight } from "@/lib/types/trip";
import type { FlightStatus } from "@/lib/supabase/database.types";

const statusTone: Record<FlightStatus, "neutral" | "success" | "warning"> = {
  searching: "neutral",
  booked: "success",
  opted_out: "warning",
};

const statusLabel: Record<FlightStatus, string> = {
  searching: "Searching",
  booked: "Booked",
  opted_out: "Opted out",
};

function formatDateTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function FlightCard({
  member,
  flight,
  isSelf,
  destination,
  startDate,
  endDate,
  onSave,
  onStatusChange,
}: {
  member: { userId: string; name: string; color?: string };
  flight: Flight | null;
  isSelf: boolean;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  onSave: (values: FlightFormValues, status: FlightStatus) => Promise<void>;
  onStatusChange: (status: FlightStatus) => Promise<void>;
}) {
  const status = flight?.status ?? "searching";
  const [unlocked, setUnlocked] = useState(false);
  const [copied, setCopied] = useState(false);
  const editable = isSelf && (status !== "booked" || unlocked);

  async function copyConfirmation() {
    if (!flight?.confirmation_number) return;
    await navigator.clipboard.writeText(flight.confirmation_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar name={member.name} color={member.color} size={28} />
          <div>
            <p className="text-sm font-medium text-ink">
              {member.name}
              {isSelf && <span className="text-ink-soft"> (you)</span>}
            </p>
          </div>
        </div>
        <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>
      </div>

      {isSelf && (
        <div className="flex flex-wrap gap-2">
          {(["searching", "booked", "opted_out"] as FlightStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onStatusChange(s)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                status === s ? "border-green bg-green/10 text-green-dark" : "border-line text-ink-soft hover:border-green/40"
              }`}
            >
              {statusLabel[s]}
            </button>
          ))}
        </div>
      )}

      {status === "opted_out" && !flight?.airline ? (
        <p className="text-sm text-ink-soft">Sitting this one out.</p>
      ) : editable ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <FlightForm
            initial={flightToFormValues(flight)}
            onCancel={unlocked ? () => setUnlocked(false) : undefined}
            onSubmit={async (values) => {
              await onSave(values, status);
              setUnlocked(false);
            }}
          />
        </motion.div>
      ) : (
        <div className="space-y-1.5 text-sm">
          {flight?.airline || flight?.flight_number ? (
            <p className="font-medium text-ink">
              {flight.airline} {flight.flight_number}
            </p>
          ) : (
            <p className="text-ink-soft">No flight details yet.</p>
          )}
          {(flight?.departure_airport || flight?.arrival_airport) && (
            <p className="text-ink-soft">
              {flight?.departure_airport ?? "?"} → {flight?.arrival_airport ?? "?"}
            </p>
          )}
          {formatDateTime(flight?.departure_time ?? null) && (
            <p className="text-ink-soft">Departs {formatDateTime(flight?.departure_time ?? null)}</p>
          )}
          {flight?.price != null && <p className="font-medium text-ink">${flight.price}</p>}
          {flight?.notes && <p className="text-ink-soft">{flight.notes}</p>}
          {flight?.confirmation_number && (
            <button
              type="button"
              onClick={copyConfirmation}
              className="inline-flex items-center gap-1.5 text-sm text-ink transition-colors hover:text-green-dark"
              title="Copy confirmation number"
            >
              <span className="text-ink-soft">Conf#</span>
              <span className="font-mono">{flight.confirmation_number}</span>
              {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3 text-ink-soft/60" />}
            </button>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {flight?.booking_link && (
              <a
                href={flight.booking_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-green-dark hover:underline"
              >
                View booking <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {isSelf && status === "booked" && (
              <Button variant="ghost" size="sm" onClick={() => setUnlocked(true)}>
                <Pencil className="h-3 w-3" />
                Edit
              </Button>
            )}
          </div>
        </div>
      )}

      {isSelf && status !== "booked" && (
        <a
          href={buildGoogleFlightsUrl(destination, startDate, endDate)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-green/60"
        >
          <Plane className="h-3.5 w-3.5" />
          Search flights on Google Flights
        </a>
      )}
    </Card>
  );
}
