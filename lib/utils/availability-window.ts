import { addDays, format, parseISO, subDays } from "date-fns";

interface DateProposalRange {
  start_date: string;
  end_date: string;
}

export function computeAvailabilityWindow(
  proposals: DateProposalRange[],
  trip: { start_date: string | null; end_date: string | null },
): { start: string; end: string } {
  if (proposals.length > 0) {
    const starts = proposals.map((p) => parseISO(p.start_date).getTime());
    const ends = proposals.map((p) => parseISO(p.end_date).getTime());
    return {
      start: format(subDays(new Date(Math.min(...starts)), 3), "yyyy-MM-dd"),
      end: format(addDays(new Date(Math.max(...ends)), 3), "yyyy-MM-dd"),
    };
  }

  if (trip.start_date && trip.end_date) {
    return {
      start: format(subDays(parseISO(trip.start_date), 3), "yyyy-MM-dd"),
      end: format(addDays(parseISO(trip.end_date), 3), "yyyy-MM-dd"),
    };
  }

  const today = new Date();
  return { start: format(addDays(today, 1), "yyyy-MM-dd"), end: format(addDays(today, 90), "yyyy-MM-dd") };
}
