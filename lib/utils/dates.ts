import { format, parseISO, isValid } from "date-fns";

export function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate || !endDate) return "Dates TBD";
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (!isValid(start) || !isValid(end)) return "Dates TBD";
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startFmt = sameMonth ? format(start, "MMM d") : format(start, "MMM d, yyyy");
  const endFmt = format(end, "MMM d, yyyy");
  return `${startFmt} – ${endFmt}`;
}

export function formatDay(date: string): string {
  const d = parseISO(date);
  return isValid(d) ? format(d, "EEEE, MMM d") : date;
}
