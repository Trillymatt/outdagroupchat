"use client";

import { useState } from "react";
import { CalendarPlus, MapPin, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CoverPhotoField } from "@/components/trips/cover-photo-field";
import { PlaceAutocomplete } from "@/components/ui/place-autocomplete";
import { formatDateRange } from "@/lib/utils/dates";

export interface TripDetailsValues {
  name: string;
  destination: string | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
  start_date: string | null;
  end_date: string | null;
  cover_image: string | null;
}

export function TripDetailsCard({ tripId, initial }: { tripId: string; initial: TripDetailsValues }) {
  const [values, setValues] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function saveCoverImage(url: string) {
    setValues((v) => ({ ...v, cover_image: url }));
    setDraft((v) => ({ ...v, cover_image: url }));
    await createClient().from("trips").update({ cover_image: url }).eq("id", tripId);
  }

  function startEditing() {
    setDraft(values);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("trips")
      .update({
        name: draft.name,
        destination: draft.destination || null,
        destination_lat: draft.destination_lat ?? null,
        destination_lng: draft.destination_lng ?? null,
        start_date: draft.start_date || null,
        end_date: draft.end_date || null,
      })
      .eq("id", tripId);
    setSaving(false);
    if (!error) {
      setValues(draft);
      setEditing(false);
    }
  }

  const coverPhoto = <CoverPhotoField folderId={tripId} currentUrl={values.cover_image} onChange={saveCoverImage} alt={values.name} />;

  if (!editing) {
    return (
      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-ink">{values.name}</h1>
            {values.destination && (
              <p className="flex items-center gap-1.5 text-sm text-ink-soft">
                <MapPin className="h-3.5 w-3.5" />
                {values.destination}
              </p>
            )}
            <p className="text-sm text-ink-soft">{formatDateRange(values.start_date, values.end_date)}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={startEditing}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
        {coverPhoto}
        {values.start_date && values.end_date && (
          <a
            href={`/api/trips/${tripId}/calendar`}
            download
            className="inline-flex items-center gap-1.5 text-xs font-medium text-green-dark hover:underline"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Add to calendar (.ics)
          </a>
        )}
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink">Trip details</h2>
        <p className="text-xs text-ink-soft">Anyone on the trip can edit these.</p>
      </div>
      {coverPhoto}
      <div>
        <Label htmlFor="trip-name">Name</Label>
        <Input id="trip-name" value={draft.name} onChange={(e) => setDraft((v) => ({ ...v, name: e.target.value }))} />
      </div>
      <div>
        <Label htmlFor="trip-destination">Destination</Label>
        <PlaceAutocomplete
          id="trip-destination"
          value={draft.destination ?? ""}
          onChange={(text) => setDraft((v) => ({ ...v, destination: text, destination_lat: null, destination_lng: null }))}
          onPlaceSelect={(place) =>
            setDraft((v) => ({ ...v, destination: place.description, destination_lat: place.lat, destination_lng: place.lng }))
          }
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="trip-start">Start date</Label>
          <Input
            id="trip-start"
            type="date"
            value={draft.start_date ?? ""}
            onChange={(e) => setDraft((v) => ({ ...v, start_date: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="trip-end">End date</Label>
          <Input
            id="trip-end"
            type="date"
            value={draft.end_date ?? ""}
            onChange={(e) => setDraft((v) => ({ ...v, end_date: e.target.value }))}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
