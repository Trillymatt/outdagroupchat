/**
 * Pure expense math. Everything internal is integer cents so per-member
 * balances and settlement transfers always sum exactly — no floating-point
 * drift, no "off by a penny" settlements.
 */

export interface MemberBalance {
  userId: string;
  /** Total this member paid out of pocket, in cents. */
  paidCents: number;
  /** Total of this member's shares across all expenses, in cents. */
  owedCents: number;
  /** paid − owed. Positive: the group owes them. Negative: they owe the group. */
  netCents: number;
}

export interface SettlementTransfer {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}

/** Convert a dollar amount (possibly floaty, e.g. 0.1 + 0.2) to integer cents. */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Split `totalCents` evenly among `userIds`. Each member gets
 * floor(total / n); the leftover cents go one apiece to the earliest members
 * in sorted-by-id order, so the split is deterministic and sums exactly.
 */
export function splitEvenlyCents(totalCents: number, userIds: string[]): Map<string, number> {
  const shares = new Map<string, number>();
  const sorted = [...userIds].sort();
  const n = sorted.length;
  if (n === 0) return shares;
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;
  sorted.forEach((id, i) => shares.set(id, base + (i < remainder ? 1 : 0)));
  return shares;
}

/**
 * Per-member net balance: what they paid minus what they owe.
 * Members with no activity are included at zero so the UI can list everyone.
 * Sorted most-owed first (ties broken by id for stability).
 */
export function computeNetBalances(
  expenses: { paid_by: string; amount: number }[],
  splits: { user_id: string; amount: number }[],
  memberIds: string[],
): MemberBalance[] {
  const byId = new Map<string, MemberBalance>();
  const ensure = (userId: string): MemberBalance => {
    let b = byId.get(userId);
    if (!b) {
      b = { userId, paidCents: 0, owedCents: 0, netCents: 0 };
      byId.set(userId, b);
    }
    return b;
  };

  for (const id of memberIds) ensure(id);
  for (const e of expenses) ensure(e.paid_by).paidCents += toCents(e.amount);
  for (const s of splits) ensure(s.user_id).owedCents += toCents(s.amount);
  for (const b of byId.values()) b.netCents = b.paidCents - b.owedCents;

  return [...byId.values()].sort((a, b) => b.netCents - a.netCents || a.userId.localeCompare(b.userId));
}

/**
 * Minimal "X owes Y $Z" transfers that settle the given balances.
 * Greedy: repeatedly match the largest debtor with the largest creditor and
 * transfer the smaller of the two amounts. Integer cents throughout, so
 * transfers sum exactly to each member's net balance.
 */
export function computeSettlements(balances: Pick<MemberBalance, "userId" | "netCents">[]): SettlementTransfer[] {
  const creditors = balances
    .filter((b) => b.netCents > 0)
    .map((b) => ({ userId: b.userId, remaining: b.netCents }));
  const debtors = balances
    .filter((b) => b.netCents < 0)
    .map((b) => ({ userId: b.userId, remaining: -b.netCents }));

  const byRemainingDesc = (a: { remaining: number; userId: string }, b: { remaining: number; userId: string }) =>
    b.remaining - a.remaining || a.userId.localeCompare(b.userId);

  const transfers: SettlementTransfer[] = [];
  while (creditors.length > 0 && debtors.length > 0) {
    creditors.sort(byRemainingDesc);
    debtors.sort(byRemainingDesc);
    const debtor = debtors[0];
    const creditor = creditors[0];
    const amount = Math.min(debtor.remaining, creditor.remaining);
    transfers.push({ fromUserId: debtor.userId, toUserId: creditor.userId, amountCents: amount });
    debtor.remaining -= amount;
    creditor.remaining -= amount;
    if (debtor.remaining === 0) debtors.shift();
    if (creditor.remaining === 0) creditors.shift();
  }
  return transfers;
}
