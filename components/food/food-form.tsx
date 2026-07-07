"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Input, Textarea, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface FoodFormValues {
  name: string;
  url: string;
  cuisine: string;
  notes: string;
}

export function FoodForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (values: FoodFormValues) => Promise<void> }) {
  const [values, setValues] = useState<FoodFormValues>({ name: "", url: "", cuisine: "", notes: "" });
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
        <Label htmlFor="food-name">Name</Label>
        <Input
          id="food-name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="Trattoria da Enzo"
          autoFocus
        />
        <FieldError>{error}</FieldError>
      </div>
      <div>
        <Label htmlFor="food-cuisine">Cuisine</Label>
        <Input
          id="food-cuisine"
          value={values.cuisine}
          onChange={(e) => setValues((v) => ({ ...v, cuisine: e.target.value }))}
          placeholder="Italian"
        />
      </div>
      <div>
        <Label htmlFor="food-url">Link</Label>
        <Input
          id="food-url"
          type="url"
          value={values.url}
          onChange={(e) => setValues((v) => ({ ...v, url: e.target.value }))}
          placeholder="https://..."
        />
      </div>
      <div>
        <Label htmlFor="food-notes">Notes</Label>
        <Textarea
          id="food-notes"
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
          Add
        </Button>
      </div>
    </motion.form>
  );
}
