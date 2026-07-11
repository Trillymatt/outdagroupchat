"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Input, Textarea, Select, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlaceAutocomplete } from "@/components/ui/place-autocomplete";
import type { ItineraryItem } from "@/lib/types/trip";
import type { ItineraryCategory } from "@/lib/supabase/database.types";

const categoryOptions: { value: ItineraryCategory; label: string }[] = [
  { value: "activity", label: "Activity" },
  { value: "food", label: "Food" },
  { value: "transport", label: "Transport" },
  { value: "lodging", label: "Lodging" },
  { value: "other", label: "Other" },
];

export interface ItineraryFormValues {
  day: string;
  time: string;
  title: string;
  description: string;
  location: string;
  lat: number | null;
  lng: number | null;
  category: ItineraryCategory;
  cost: string;
  link: string;
}

export function ItineraryItemForm({
  day,
  initial,
  onCancel,
  onSubmit,
}: {
  day: string;
  initial?: ItineraryItem;
  onCancel: () => void;
  onSubmit: (values: ItineraryFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<ItineraryFormValues>({
    day: initial?.day ?? day,
    time: initial?.time?.slice(0, 5) ?? "",
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    location: initial?.location ?? "",
    lat: initial?.lat ?? null,
    lng: initial?.lng ?? null,
    category: initial?.category ?? "activity",
    cost: initial?.cost != null ? String(initial.cost) : "",
    link: initial?.link ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.title.trim()) {
      setError("Title is required");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSubmit(values);
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 36 }}
      onSubmit={handleSubmit}
      className="space-y-3 overflow-hidden rounded-2xl border border-dashed border-green/40 bg-green/5 p-3.5"
    >
      <div>
        <Label htmlFor="item-title">Title</Label>
        <Input
          id="item-title"
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          placeholder="Hike to the summit"
          autoFocus
        />
        <FieldError>{error}</FieldError>
      </div>

      <div>
        <Label htmlFor="item-link">Link (optional)</Label>
        <Input
          id="item-link"
          type="url"
          value={values.link}
          onChange={(e) => setValues((v) => ({ ...v, link: e.target.value }))}
          placeholder="https://..."
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="item-day">Day</Label>
          <Input id="item-day" type="date" value={values.day} onChange={(e) => setValues((v) => ({ ...v, day: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="item-time">Time (optional)</Label>
          <Input id="item-time" type="time" value={values.time} onChange={(e) => setValues((v) => ({ ...v, time: e.target.value }))} />
        </div>
      </div>

      <div>
        <Label htmlFor="item-description">Description</Label>
        <Textarea
          id="item-description"
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          placeholder="Any notes worth knowing"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="item-location">Location</Label>
          <PlaceAutocomplete
            id="item-location"
            value={values.location}
            onChange={(text) => setValues((v) => ({ ...v, location: text, lat: null, lng: null }))}
            onPlaceSelect={(place) => setValues((v) => ({ ...v, location: place.description, lat: place.lat, lng: place.lng }))}
            placeholder="Where"
          />
        </div>
        <div>
          <Label htmlFor="item-cost">Cost (optional)</Label>
          <Input
            id="item-cost"
            type="number"
            step="0.01"
            min="0"
            value={values.cost}
            onChange={(e) => setValues((v) => ({ ...v, cost: e.target.value }))}
            placeholder="0.00"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="item-category">Category</Label>
        <Select
          id="item-category"
          value={values.category}
          onChange={(e) => setValues((v) => ({ ...v, category: e.target.value as ItineraryCategory }))}
        >
          {categoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {initial ? "Save changes" : "Add item"}
        </Button>
      </div>
    </motion.form>
  );
}
