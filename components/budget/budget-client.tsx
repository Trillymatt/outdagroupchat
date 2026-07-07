"use client";

import { useMemo } from "react";
import { useRealtimeList } from "@/lib/hooks/use-realtime-list";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { computeBudget } from "@/lib/budget/compute";
import type { Flight, LodgingOption, ItineraryItem } from "@/lib/types/trip";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function BudgetClient({
  tripId,
  members,
  initialFlights,
  initialLodging,
  initialItineraryItems,
  nights,
}: {
  tripId: string;
  members: { userId: string; name: string }[];
  initialFlights: Flight[];
  initialLodging: LodgingOption[];
  initialItineraryItems: ItineraryItem[];
  nights: number | null;
}) {
  const [flights] = useRealtimeList<Flight>("flights", tripId, initialFlights);
  const [lodging] = useRealtimeList<LodgingOption>("lodging_options", tripId, initialLodging);
  const [itineraryItems] = useRealtimeList<ItineraryItem>("itinerary_items", tripId, initialItineraryItems);

  const summary = useMemo(
    () =>
      computeBudget(
        members,
        flights.map((f) => ({ userId: f.user_id, price: f.price, status: f.status })),
        lodging.map((l) => ({ pricePerNight: l.price_per_night, status: l.status })),
        itineraryItems.map((i) => ({ cost: i.cost })),
        nights,
      ),
    [members, flights, lodging, itineraryItems, nights],
  );

  const hasAnyCost = summary.tripTotal > 0;
  const sortedPeople = useMemo(() => [...summary.perPerson].sort((a, b) => b.total - a.total), [summary]);

  if (!hasAnyCost) {
    return <EmptyState title="No costs tracked yet" description="Add flight prices, book lodging, or price out itinerary items to see the budget here." />;
  }

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden text-center">
        <p className="text-sm text-ink-soft">Trip total</p>
        <p className="text-sync-gradient text-4xl font-semibold tracking-tight">{currency.format(summary.tripTotal)}</p>
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4 text-sm">
          <div>
            <p className="font-semibold text-ink">{currency.format(summary.flightsTotal)}</p>
            <p className="text-ink-soft">Flights</p>
          </div>
          <div>
            <p className="font-semibold text-ink">{currency.format(summary.lodgingTotal)}</p>
            <p className="text-ink-soft">Lodging</p>
          </div>
          <div>
            <p className="font-semibold text-ink">{currency.format(summary.itineraryTotal)}</p>
            <p className="text-ink-soft">Itinerary</p>
          </div>
        </div>
      </Card>

      {nights === null && (
        <p className="rounded-2xl border border-dashed border-line bg-surface px-4 py-3 text-sm text-ink-soft">
          Set trip dates on the Overview tab to include lodging in the budget.
        </p>
      )}

      <Card className="space-y-1">
        <h2 className="mb-2 font-semibold text-ink">Per person</h2>
        <div className="divide-y divide-line">
          {sortedPeople.map((p) => (
            <div key={p.userId} className="flex flex-col gap-1 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="font-medium text-ink">{p.name}</span>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-soft">
                <span>Flight {currency.format(p.flightCost)}</span>
                <span>Lodging {currency.format(p.lodgingShare)}</span>
                <span>Itinerary {currency.format(p.itineraryShare)}</span>
                <span className="font-semibold text-ink">{currency.format(p.total)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
