"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Input, Textarea, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface LodgingFormValues {
  name: string;
  url: string;
  price_per_night: string;
  notes: string;
}

export function LodgingForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (values: LodgingFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<LodgingFormValues>({ name: "", url: "", price_per_night: "", notes: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
