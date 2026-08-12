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

/**
 * Parse a lenient time string into minutes since midnight, or null.
 * Accepts the canonical padded 24h "HH:MM", legacy free-text "H:MM AM/PM",
 * and bare "H:MM" / "HH".
 */
export function parseTimeToMinutes(
  timeStr: string | null | undefined,
): number | null {
  if (!timeStr) return null;
  const match = timeStr
    .trim()
    .match(/^(\d{1,2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  const period = match[3]?.toUpperCase();
  if (period === "PM" && hour < 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

/** Format minutes since midnight as the padded 24h "HH:MM" storage form. */
export function formatTime24h(minutes: number): string {
  const clamped = ((minutes % 1440) + 1440) % 1440;
  const h = String(Math.floor(clamped / 60)).padStart(2, "0");
  const m = String(clamped % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/** Format minutes since midnight as a 12h display string like "9:30 PM". */
export function formatTime12h(minutes: number): string {
  const clamped = ((minutes % 1440) + 1440) % 1440;
  const h24 = Math.floor(clamped / 60);
  const hour = h24 % 12 === 0 ? 12 : h24 % 12;
  const period = h24 >= 12 ? "PM" : "AM";
  return `${hour}:${String(clamped % 60).padStart(2, "0")} ${period}`;
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

// ─── Week window ──────────────────────────────────────────────────────────────

/**
 * Inclusive end of the current week (Friday 23:59:59) relative to `from`.
 * Mirrors the "This Week" bucket the Incoming list uses, so a header badge and
 * the list it opens agree on what counts as "this week".
 */
export function endOfWeek(from: Date): Date {
  const dow = from.getDay();
  const monday = new Date(from);
  monday.setDate(from.getDate() - (dow === 0 ? 6 : dow - 1));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);
  return friday;
}

/**
 * True if a stored date string falls between now and end-of-week (inclusive),
 * i.e. it's "incoming this week". Past-due dates count too — an overdue
 * deadline is still something the user should see flagged.
 */
export function isWithinThisWeek(
  dateStr: string | null | undefined,
  from: Date,
): boolean {
  const parsed = parseDate(dateStr ?? null);
  if (!parsed) return false;
  return parsed <= endOfWeek(from);
}
