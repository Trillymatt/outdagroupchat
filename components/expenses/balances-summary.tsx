"use client";

import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import type { MemberBalance, SettlementTransfer } from "@/lib/expenses/balances";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function formatCents(cents: number) {
  return currency.format(cents / 100);
}

export function BalancesSummary({
  balances,
  transfers,
  memberLookup,
}: {
  balances: MemberBalance[];
  transfers: SettlementTransfer[];
  memberLookup: Map<string, { name: string; color?: string }>;
}) {
  const nameOf = (userId: string) => memberLookup.get(userId)?.name ?? "Someone";

  return (
    <Card className="space-y-4">
      <h2 className="font-semibold text-ink">Balances</h2>

      <div className="divide-y divide-line">
        {balances.map((b) => {
          const member = memberLookup.get(b.userId) ?? { name: "Someone" };
          return (
            <div key={b.userId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar name={member.name} color={member.color} size={26} />
                <span className="truncate font-medium text-ink">{member.name}</span>
              </div>
              <div className="shrink-0 text-right">
                {b.netCents === 0 ? (
                  <span className="text-ink-soft">settled up</span>
                ) : b.netCents > 0 ? (
                  <span className="font-semibold text-success">gets back {formatCents(b.netCents)}</span>
                ) : (
                  <span className="font-semibold text-danger">owes {formatCents(-b.netCents)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-line pt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Settle up</h3>
        {transfers.length === 0 ? (
          <p className="text-sm text-ink-soft">Everyone is squared away — nothing to settle.</p>
        ) : (
          <ul className="space-y-1.5">
            {transfers.map((t) => (
              <li
                key={`${t.fromUserId}-${t.toUserId}`}
                className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-green/5 px-3 py-2 text-sm"
              >
                <span className="font-medium text-ink">{nameOf(t.fromUserId)}</span>
                <span className="text-ink-soft">owes</span>
                <span className="font-medium text-ink">{nameOf(t.toUserId)}</span>
                <ArrowRight className="h-3.5 w-3.5 text-green-dark" />
                <span className="font-semibold text-green-dark">{formatCents(t.amountCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
