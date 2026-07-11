"use client";

import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import type { Expense } from "@/lib/types/trip";
import type { ExpenseCategory } from "@/lib/supabase/database.types";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const categoryLabels: Record<ExpenseCategory, string> = {
  lodging: "Lodging",
  food: "Food",
  transport: "Transport",
  activity: "Activity",
  other: "Other",
};

function formatExpenseDate(date: string) {
  const d = parseISO(date);
  return isValid(d) ? format(d, "MMM d") : date;
}

export function ExpenseCard({
  expense,
  payer,
  splitCount,
  canDelete,
  onDelete,
}: {
  expense: Expense;
  payer: { name: string; color?: string };
  splitCount: number;
  canDelete: boolean;
  onDelete: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      className="group flex items-center gap-3 rounded-2xl border border-line bg-paper p-4"
    >
      <Avatar name={payer.name} color={payer.color} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-ink">{expense.description}</p>
          {expense.category && <Badge tone="green">{categoryLabels[expense.category]}</Badge>}
        </div>
        <p className="text-xs text-ink-soft">
          {payer.name} paid · {formatExpenseDate(expense.expense_date)}
          {splitCount > 0 && <> · split {splitCount === 1 ? "1 way" : `${splitCount} ways`}</>}
        </p>
      </div>
      <p className="shrink-0 font-semibold text-ink">{currency.format(expense.amount)}</p>
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 rounded-lg p-1 text-ink-soft/40 opacity-0 transition-opacity hover:bg-ink/5 hover:text-danger group-hover:opacity-100"
          aria-label="Delete expense"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </motion.div>
  );
}
