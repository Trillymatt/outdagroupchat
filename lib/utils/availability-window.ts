import { addDays, differenceInCalendarDays, format, parseISO, subDays } from "date-fns";

export function computeAvailabilityWindow(trip: { start_date: string | null; end_date: string | null }): {
  start: string;
  end: string;
} {
  if (trip.start_date && trip.end_date) {
    return {
      start: format(subDays(parseISO(trip.start_date), 3), "yyyy-MM-dd"),
      end: format(addDays(parseISO(trip.end_date), 3), "yyyy-MM-dd"),
    };
  }

  const today = new Date();
  return { start: format(addDays(today, 1), "yyyy-MM-dd"), end: format(addDays(today, 90), "yyyy-MM-dd") };
}

export interface BestWindow {
  start: string;
  end: string;
  freeCount: number;
}

/**
 * Finds the run of consecutive days where the most people are free for every day in the run,
 * preferring longer runs on ties. Returns null when nobody has marked availability.
 */
export function computeBestWindow(availability: { user_id: string; date: string }[]): BestWindow | null {
  const byDate = new Map<string, Set<string>>();
  for (const a of availability) {
    const set = byDate.get(a.date) ?? new Set<string>();
    set.add(a.user_id);
    byDate.set(a.date, set);
  }

  const dates = [...byDate.keys()].sort();
  let best: BestWindow | null = null;
  let bestLength = 0;

  for (let i = 0; i < dates.length; i++) {
    let free = new Set(byDate.get(dates[i])!);
    for (let j = i; j < dates.length; j++) {
      if (j > i) {
        if (differenceInCalendarDays(parseISO(dates[j]), parseISO(dates[j - 1])) !== 1) break;
        free = new Set([...free].filter((userId) => byDate.get(dates[j])!.has(userId)));
        if (free.size === 0) break;
      }
      const length = j - i + 1;
      if (!best || free.size > best.freeCount || (free.size === best.freeCount && length > bestLength)) {
        best = { start: dates[i], end: dates[j], freeCount: free.size };
        bestLength = length;
      }
    }
  }

  return best;
}
