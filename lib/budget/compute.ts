export interface BudgetMember {
  userId: string;
  name: string;
}

export interface BudgetFlight {
  userId: string;
  price: number | null;
  status: string;
}

export interface BudgetLodging {
  pricePerNight: number | null;
  status: string;
}

export interface BudgetItineraryItem {
  cost: number | null;
}

export interface PerPersonBudget {
  userId: string;
  name: string;
  flightCost: number;
  lodgingShare: number;
  itineraryShare: number;
  total: number;
}

export interface BudgetSummary {
  perPerson: PerPersonBudget[];
  tripTotal: number;
  flightsTotal: number;
  lodgingTotal: number;
  itineraryTotal: number;
}

export function computeBudget(
  members: BudgetMember[],
  flights: BudgetFlight[],
  lodging: BudgetLodging[],
  itineraryItems: BudgetItineraryItem[],
  nights: number | null,
): BudgetSummary {
  const memberCount = members.length;

  const lodgingPerNightTotal = lodging.filter((l) => l.status === "booked").reduce((sum, l) => sum + (l.pricePerNight ?? 0), 0);
  const lodgingTotal = nights ? lodgingPerNightTotal * nights : 0;
  const lodgingShare = memberCount > 0 ? lodgingTotal / memberCount : 0;

  const itineraryTotal = itineraryItems.reduce((sum, i) => sum + (i.cost ?? 0), 0);
  const itineraryShare = memberCount > 0 ? itineraryTotal / memberCount : 0;

  const flightByUser = new Map(flights.map((f) => [f.userId, f.price ?? 0]));

  const perPerson: PerPersonBudget[] = members.map((m) => {
    const flightCost = flightByUser.get(m.userId) ?? 0;
    return {
      userId: m.userId,
      name: m.name,
      flightCost,
      lodgingShare,
      itineraryShare,
      total: flightCost + lodgingShare + itineraryShare,
    };
  });

  const flightsTotal = perPerson.reduce((sum, p) => sum + p.flightCost, 0);
  const tripTotal = flightsTotal + lodgingTotal + itineraryTotal;

  return { perPerson, tripTotal, flightsTotal, lodgingTotal, itineraryTotal };
}
