"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface TripDetailsValues {
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
}

export function TripDetailsCard({ tripId, initial }: { tripId: string; initial: TripDetailsValues }) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    const { error } = await supabase
      .from("trips")
      .update({
        name: values.name,
        destination: values.destination || null,
        start_date: values.start_date || null,
        end_date: values.end_date || null,
      })
      .eq("id", tripId);
    setSaving(false);
    if (!error) setSaved(true);
  }

  return (
    <Card className="space-y-4">
      <h2 className="font-semibold text-ink">Trip details</h2>
      <p className="text-xs text-ink-soft">Anyone on the trip can edit these.</p>
      <div>
        <Label htmlFor="trip-name">Name</Label>
        <Input id="trip-name" value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
      </div>
      <div>
        <Label htmlFor="trip-destination">Destination</Label>
        <Input
          id="trip-destination"
          value={values.destination ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, destination: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="trip-start">Start date</Label>
          <Input
            id="trip-start"
            type="date"
            value={values.start_date ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, start_date: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="trip-end">End date</Label>
          <Input
            id="trip-end"
            type="date"
            value={values.end_date ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, end_date: e.target.value }))}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {saved && <span className="text-sm font-medium text-success">Saved</span>}
      </div>
    </Card>
  );
}
