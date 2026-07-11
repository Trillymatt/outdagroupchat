// Pure iCalendar (RFC 5545) builder — no I/O, no clock access (callers pass `now`).

const CRLF = "\r\n";

interface IcsEventCommon {
  /** Stable unique id, e.g. `{rowId}@tandem`. */
  uid: string;
  summary: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
}

export type IcsEvent =
  | (IcsEventCommon & {
      allDay: true;
      /** YYYY-MM-DD */
      start: string;
      /** Exclusive end date (YYYY-MM-DD). Defaults to the day after `start`. */
      end?: string;
    })
  | (IcsEventCommon & { allDay: false; start: Date; end?: Date });

/** Escapes an iCalendar TEXT value: backslashes, semicolons, commas, and newlines. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Folds a content line at 75 octets (RFC 5545 §3.1). Continuation lines start
 * with a single space that counts toward the 75-octet limit. Splits only at
 * character boundaries so multi-byte UTF-8 sequences stay intact.
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let currentOctets = 0;
  for (const ch of line) {
    const chOctets = encoder.encode(ch).length;
    if (currentOctets + chOctets > 75) {
      parts.push(current);
      current = " ";
      currentOctets = 1;
    }
    current += ch;
    currentOctets += chOctets;
  }
  parts.push(current);
  return parts.join(CRLF);
}

/** Adds `days` to a YYYY-MM-DD date string (UTC math — no DST surprises). */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function formatDateValue(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

function formatUtcDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/**
 * Builds a complete VCALENDAR string with CRLF line endings and folded lines.
 * `now` becomes every event's DTSTAMP (passed in rather than read from the
 * clock so output is deterministic and testable).
 */
export function buildCalendar({
  calendarName,
  events,
  now,
}: {
  calendarName?: string;
  events: IcsEvent[];
  now: Date;
}): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tandem//Trip Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  if (calendarName) lines.push(`X-WR-CALNAME:${escapeText(calendarName)}`);

  const dtstamp = formatUtcDateTime(now);
  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeText(event.uid)}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatDateValue(event.start)}`);
      lines.push(`DTEND;VALUE=DATE:${formatDateValue(event.end ?? addDays(event.start, 1))}`);
    } else {
      lines.push(`DTSTART:${formatUtcDateTime(event.start)}`);
      if (event.end) lines.push(`DTEND:${formatUtcDateTime(event.end)}`);
    }
    lines.push(`SUMMARY:${escapeText(event.summary)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    if (event.url) lines.push(`URL:${escapeText(event.url)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");

  return lines.map(foldLine).join(CRLF) + CRLF;
}
