import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExpensesClient } from "@/components/expenses/expenses-client";
import type { Expense, ExpenseSplit } from "@/lib/types/trip";

export const metadata: Metadata = { title: "Expenses — Tandem" };

export default async function ExpensesPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: expenses }, { data: members }] = await Promise.all([
    supabase.from("expenses").select("*").eq("trip_id", tripId).order("created_at", { ascending: false }),
    supabase.from("trip_members").select("user_id, display_name, profiles(name, avatar_color)").eq("trip_id", tripId),
  ]);

  const expenseIds = (expenses ?? []).map((e) => e.id);
  const { data: splits } = expenseIds.length
    ? await supabase.from("expense_splits").select("*").in("expense_id", expenseIds)
    : { data: [] as ExpenseSplit[] };

  const memberList = (members ?? []).map((m) => {
    const profile = (m as unknown as { profiles: { name: string; avatar_color: string } | null }).profiles;
    return { userId: m.user_id, name: profile?.name ?? m.display_name ?? "Someone", color: profile?.avatar_color };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
        <p className="text-sm text-ink-soft">Track who paid for what and settle up at the end.</p>
      </div>
      <ExpensesClient
        tripId={tripId}
        currentUserId={user.id}
        members={memberList}
        initialExpenses={(expenses ?? []) as Expense[]}
        initialSplits={(splits ?? []) as ExpenseSplit[]}
      />
    </div>
  );
}
