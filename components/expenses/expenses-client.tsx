"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Plus, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notifyOptedInMembers } from "@/lib/actions/notify";
import { useRealtimeList } from "@/lib/hooks/use-realtime-list";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BalancesSummary } from "@/components/expenses/balances-summary";
import { ExpenseCard } from "@/components/expenses/expense-card";
import { ExpenseForm, type ExpenseFormValues } from "@/components/expenses/expense-form";
import { computeNetBalances, computeSettlements, splitEvenlyCents, toCents } from "@/lib/expenses/balances";
import type { Expense, ExpenseSplit } from "@/lib/types/trip";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const splitKey = (s: Pick<ExpenseSplit, "expense_id" | "user_id">) => `${s.expense_id}:${s.user_id}`;

/**
 * expense_splits has no trip_id column, so the shared realtime hooks can't
 * scope a subscription to this trip. We listen unfiltered (RLS still limits
 * events to trips we belong to) and join against the current expense list at
 * compute time, so rows from other trips never affect the math.
 */
function useRealtimeSplits(tripId: string, initial: ExpenseSplit[]) {
  const [splits, setSplits] = useState<ExpenseSplit[]>(initial);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`expense_splits-${tripId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "expense_splits" }, (payload) => {
        const row = payload.new as ExpenseSplit;
        setSplits((prev) => (prev.some((s) => splitKey(s) === splitKey(row)) ? prev : [...prev, row]));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "expense_splits" }, (payload) => {
        const row = payload.old as Pick<ExpenseSplit, "expense_id" | "user_id">;
        setSplits((prev) => prev.filter((s) => splitKey(s) !== splitKey(row)));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  return [splits, setSplits] as const;
}

export function ExpensesClient({
  tripId,
  currentUserId,
  members,
  initialExpenses,
  initialSplits,
}: {
  tripId: string;
  currentUserId: string;
  members: { userId: string; name: string; color?: string }[];
  initialExpenses: Expense[];
  initialSplits: ExpenseSplit[];
}) {
  const [expenses, setExpenses] = useRealtimeList<Expense>("expenses", tripId, initialExpenses);
  const [splits, setSplits] = useRealtimeSplits(tripId, initialSplits);
  const [adding, setAdding] = useState(false);

  const memberLookup = useMemo(
    () => new Map(members.map((m) => [m.userId, { name: m.name, color: m.color }])),
    [members],
  );

  const sorted = useMemo(
    () =>
      [...expenses].sort(
        (a, b) => b.expense_date.localeCompare(a.expense_date) || b.created_at.localeCompare(a.created_at),
      ),
    [expenses],
  );

  const splitCountByExpense = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of splits) map.set(s.expense_id, (map.get(s.expense_id) ?? 0) + 1);
    return map;
  }, [splits]);

  const { balances, transfers } = useMemo(() => {
    const expenseIds = new Set(expenses.map((e) => e.id));
    const relevantSplits = splits.filter((s) => expenseIds.has(s.expense_id));
    const balances = computeNetBalances(
      expenses,
      relevantSplits,
      members.map((m) => m.userId),
    );
    return { balances, transfers: computeSettlements(balances) };
  }, [expenses, splits, members]);

  async function handleAdd(values: ExpenseFormValues) {
    const supabase = createClient();
    const amount = Math.round(Number.parseFloat(values.amount) * 100) / 100;

    const { data: expense, error } = await supabase
      .from("expenses")
      .insert({
        trip_id: tripId,
        paid_by: values.paidBy,
        description: values.description.trim(),
        amount,
        category: values.category || null,
        expense_date: values.expenseDate,
      })
      .select()
      .single();

    if (error || !expense) return;

    const shares = splitEvenlyCents(toCents(amount), values.splitAmong);
    const splitRows = [...shares.entries()].map(([userId, cents]) => ({
      expense_id: expense.id,
      user_id: userId,
      amount: cents / 100,
    }));
    const { error: splitError } = await supabase.from("expense_splits").insert(splitRows);
    if (splitError) {
      await supabase.from("expenses").delete().eq("id", expense.id);
      return;
    }

    setExpenses((prev) => (prev.some((e) => e.id === expense.id) ? prev : [...prev, expense]));
    setSplits((prev) => {
      const existing = new Set(prev.map(splitKey));
      return [...prev, ...splitRows.filter((s) => !existing.has(splitKey(s)))];
    });
    setAdding(false);

    const payerName = memberLookup.get(values.paidBy)?.name ?? "Someone";
    void notifyOptedInMembers(
      tripId,
      `${payerName} logged a ${currency.format(amount)} expense on Tandem: "${values.description.trim()}".`,
      currentUserId,
    );
  }

  async function handleDelete(expenseId: string) {
    if (!confirm("Delete this expense?")) return;
    const supabase = createClient();
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    setSplits((prev) => prev.filter((s) => s.expense_id !== expenseId));
    await supabase.from("expense_splits").delete().eq("expense_id", expenseId);
    await supabase.from("expenses").delete().eq("id", expenseId);
  }

  return (
    <div className="space-y-6">
      {expenses.length > 0 && <BalancesSummary balances={balances} transfers={transfers} memberLookup={memberLookup} />}

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">Add an expense</h2>
          <Button size="sm" variant={adding ? "ghost" : "primary"} onClick={() => setAdding((v) => !v)}>
            <Plus className="h-3.5 w-3.5" />
            {adding ? "Cancel" : "Add expense"}
          </Button>
        </div>
        <AnimatePresence initial={false}>
          {adding && (
            <ExpenseForm
              key="add-form"
              members={members}
              currentUserId={currentUserId}
              onCancel={() => setAdding(false)}
              onSubmit={handleAdd}
            />
          )}
        </AnimatePresence>
      </Card>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-8 w-8" />}
          title="No expenses yet"
          description="Log what you paid for and Tandem will figure out who owes whom."
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {sorted.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                payer={memberLookup.get(expense.paid_by) ?? { name: "Someone" }}
                splitCount={splitCountByExpense.get(expense.id) ?? 0}
                canDelete={expense.created_by === currentUserId}
                onDelete={() => handleDelete(expense.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
