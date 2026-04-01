// ─── Constants ────────────────────────────────────────────────────────────────

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const MONTH_ABBRS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// ─── Parsing & formatting ─────────────────────────────────────────────────────

/** Parse a DD/MM/YYYY string into a Date (midnight local time), or null. */
export function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  return new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
}

/** Format a Date to YYYY-MM-DD. */
export function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Format a Date to DD/MM/YYYY. */
export function toDisplayDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/** Format a Date to a human-readable label like "Monday, Jan 1". */
export function formatDateLabel(d: Date): string {
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_ABBRS[d.getMonth()]} ${d.getDate()}`;
}

// ─── Comparison ───────────────────────────────────────────────────────────────

/** Compare two Date objects at day-level. */
export function isSameDayDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Compare a stored "DD/MM/YYYY" date string against a JS Date (day-level). */
export function isSameDay(
  dateStr: string | null | undefined,
  target: Date,
): boolean {
  if (!dateStr) return false;
  const parsed = parseDate(dateStr);
  if (!parsed) return false;
  return isSameDayDate(parsed, target);
}
