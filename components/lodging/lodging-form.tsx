"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Input, Textarea, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export interface LodgingFormValues {
  name: string;
  url: string;
  price_per_night: string;
  notes: string;
  confirmation_number: string;
  booking_url: string;
  booking_notes: string;
}

export function LodgingForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (values: LodgingFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<LodgingFormValues>({
    name: "",
    url: "",
    price_per_night: "",
    notes: "",
    confirmation_number: "",
    booking_url: "",
    booking_notes: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showBooking, setShowBooking] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) {
      setError("Name is required");
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
        <Label htmlFor="lodging-name">Name</Label>
        <Input
          id="lodging-name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="Villa Sunset"
          autoFocus
        />
        <FieldError>{error}</FieldError>
      </div>
      <div>
        <Label htmlFor="lodging-url">Link</Label>
        <Input
          id="lodging-url"
          type="url"
          value={values.url}
          onChange={(e) => setValues((v) => ({ ...v, url: e.target.value }))}
          placeholder="https://airbnb.com/..."
        />
      </div>
      <div>
        <Label htmlFor="lodging-price">Price per night</Label>
        <Input
          id="lodging-price"
          type="number"
          step="0.01"
          min="0"
          value={values.price_per_night}
          onChange={(e) => setValues((v) => ({ ...v, price_per_night: e.target.value }))}
          placeholder="0.00"
        />
      </div>
      <div>
        <Label htmlFor="lodging-notes">Notes</Label>
        <Textarea
          id="lodging-notes"
          value={values.notes}
          onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
          placeholder="Why this one?"
        />
      </div>
      <div>
        <button
          type="button"
          onClick={() => setShowBooking((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft transition-colors hover:text-ink"
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showBooking && "rotate-180")} />
          Booking details (optional)
        </button>
        {showBooking && (
          <div className="mt-3 space-y-3">
            <div>
              <Label htmlFor="lodging-confirmation">Confirmation number</Label>
              <Input
                id="lodging-confirmation"
                value={values.confirmation_number}
                onChange={(e) => setValues((v) => ({ ...v, confirmation_number: e.target.value }))}
                placeholder="ABC123"
              />
            </div>
            <div>
              <Label htmlFor="lodging-booking-url">Booking link</Label>
              <Input
                id="lodging-booking-url"
                type="url"
                value={values.booking_url}
                onChange={(e) => setValues((v) => ({ ...v, booking_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor="lodging-booking-notes">Booking notes</Label>
              <Textarea
                id="lodging-booking-notes"
                value={values.booking_notes}
                onChange={(e) => setValues((v) => ({ ...v, booking_notes: e.target.value }))}
                placeholder="Check-in after 3pm, gate code, etc."
              />
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          Propose
        </Button>
      </div>
    </motion.form>
  );
}
