"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Input, Select, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ExpenseCategory } from "@/lib/supabase/database.types";

export interface ExpenseFormValues {
  description: string;
  amount: string;
  category: ExpenseCategory | "";
  expenseDate: string;
  paidBy: string;
  splitAmong: string[];
}

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "lodging", label: "Lodging" },
  { value: "food", label: "Food" },
  { value: "transport", label: "Transport" },
  { value: "activity", label: "Activity" },
  { value: "other", label: "Other" },
];

function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ExpenseForm({
  members,
  currentUserId,
  onCancel,
  onSubmit,
}: {
  members: { userId: string; name: string }[];
  currentUserId: string;
  onCancel: () => void;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<ExpenseFormValues>({
    description: "",
    amount: "",
    category: "",
    expenseDate: today(),
    paidBy: currentUserId,
    splitAmong: members.map((m) => m.userId),
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function toggleSplitMember(userId: string) {
    setValues((v) => ({
      ...v,
      splitAmong: v.splitAmong.includes(userId) ? v.splitAmong.filter((id) => id !== userId) : [...v.splitAmong, userId],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number.parseFloat(values.amount);
    if (!values.description.trim()) {
      setError("Description is required");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero");
      return;
    }
    if (values.splitAmong.length === 0) {
      setError("Pick at least one person to split with");
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
        <Label htmlFor="expense-description">Description</Label>
        <Input
          id="expense-description"
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          placeholder="Groceries, gas, tickets…"
          autoFocus
        />
        <FieldError>{error}</FieldError>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="expense-amount">Amount ($)</Label>
          <Input
            id="expense-amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={values.amount}
            onChange={(e) => setValues((v) => ({ ...v, amount: e.target.value }))}
            placeholder="42.50"
          />
        </div>
        <div>
          <Label htmlFor="expense-category">Category</Label>
          <Select
            id="expense-category"
            value={values.category}
            onChange={(e) => setValues((v) => ({ ...v, category: e.target.value as ExpenseCategory | "" }))}
          >
            <option value="">No category</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="expense-date">Date</Label>
          <Input
            id="expense-date"
            type="date"
            value={values.expenseDate}
            onChange={(e) => setValues((v) => ({ ...v, expenseDate: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="expense-paid-by">Paid by</Label>
          <Select
            id="expense-paid-by"
            value={values.paidBy}
            onChange={(e) => setValues((v) => ({ ...v, paidBy: e.target.value }))}
          >
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label>Split among</Label>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => {
            const checked = values.splitAmong.includes(m.userId);
            return (
              <label
                key={m.userId}
                className={
                  checked
                    ? "flex cursor-pointer items-center gap-1.5 rounded-full border border-green/60 bg-green/10 px-3 py-1.5 text-xs font-medium text-green-dark"
                    : "flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-soft"
                }
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSplitMember(m.userId)}
                  className="h-3.5 w-3.5 accent-[#1f5f42]"
                />
                {m.name}
              </label>
            );
          })}
        </div>
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
