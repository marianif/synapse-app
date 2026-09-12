import type {
  DbEntry,
  DbHabit,
  DbRecurrenceCompletion,
  RecurrenceRule,
  RecurringInstance,
} from "@/lib/types";

// ─── Serialization ────────────────────────────────────────────────────────────

export function serializeRule(rule: RecurrenceRule): string {
  return JSON.stringify(rule);
}

export function parseRule(raw: string | null): RecurrenceRule | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RecurrenceRule;
  } catch {
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isRecurringEntry(entry: DbEntry): boolean {
  return entry.recurrence_rule !== null && entry.recurrence_rule !== undefined;
}

/** Parse a DD/MM/YYYY string into a Date (midnight local time). */
function parseDDMMYYYY(dateStr: string): Date | null {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  const d = new Date(
    parseInt(yyyy, 10),
    parseInt(mm, 10) - 1,
    parseInt(dd, 10),
  );
  if (isNaN(d.getTime())) return null;
  return d;
}

/** Format a Date to DD/MM/YYYY. */
function formatDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Add one calendar month, clamping to end-of-month if needed. */
function addMonth(d: Date): Date {
  const result = new Date(d);
  const targetMonth = d.getMonth() + 1;
  result.setMonth(targetMonth);
  // If month overflowed (e.g. Jan 31 + 1 month → Mar 3), clamp to last day
  if (result.getMonth() !== targetMonth % 12) {
    result.setDate(0); // last day of targetMonth
  }
  return result;
}

/** One-year cap so infinite rules don't run forever. */
function oneYearFrom(d: Date): Date {
  const result = new Date(d);
  result.setFullYear(result.getFullYear() + 1);
  return result;
}

// ─── Expansion ────────────────────────────────────────────────────────────────

/**
 * A bare cadence: a rule plus its first (and optional last) occurrence date.
 * Entries and habits both reduce to this, so the expansion math lives in one
 * place — habits are not entries and must not pretend to be one.
 */
export interface Cadence {
  rule: RecurrenceRule;
  /** First occurrence, DD/MM/YYYY. */
  startDate: string;
  /** Optional last occurrence, DD/MM/YYYY. Null / undefined = open-ended. */
  endDate?: string | null;
}

/**
 * Returns all occurrence dates (DD/MM/YYYY) for a cadence that fall within
 * [fromDate, toDate] inclusive, capped at one year from today so an infinite
 * rule can never run away.
 */
export function expandCadence(
  cadence: Cadence,
  fromDate: Date,
  toDate: Date,
): string[] {
  const { rule } = cadence;
  const startDate = parseDDMMYYYY(cadence.startDate);
  if (!startDate) return [];

  // Parse optional end date from the cadence itself
  let effectiveEnd = toDate;
  if (cadence.endDate) {
    const end = parseDDMMYYYY(cadence.endDate);
    if (end && end < effectiveEnd) {
      effectiveEnd = end;
    }
  }

  // Cap at one year from today to prevent runaway expansion
  const cap = oneYearFrom(new Date());
  if (cap < effectiveEnd) effectiveEnd = cap;

  const occurrences: string[] = [];

  if (rule.freq === "daily") {
    const cursor = new Date(startDate);
    while (cursor <= effectiveEnd) {
      if (cursor >= fromDate && cursor >= startDate) {
        occurrences.push(formatDDMMYYYY(cursor));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (rule.freq === "weekdays") {
    const cursor = new Date(startDate);
    while (cursor <= effectiveEnd) {
      const dow = cursor.getDay();
      if (dow >= 1 && dow <= 5 && cursor >= fromDate && cursor >= startDate) {
        occurrences.push(formatDDMMYYYY(cursor));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (rule.freq === "weekly") {
    // Default to the start date's day-of-week if no days specified
    const targetDays =
      rule.days && rule.days.length > 0 ? rule.days : [startDate.getDay()];

    const cursor = new Date(startDate);
    while (cursor <= effectiveEnd) {
      const dow = cursor.getDay();
      if (
        targetDays.includes(dow) &&
        cursor >= fromDate &&
        cursor >= startDate
      ) {
        occurrences.push(formatDDMMYYYY(cursor));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (rule.freq === "monthly") {
    let cursor = new Date(startDate);
    while (cursor <= effectiveEnd) {
      if (cursor >= fromDate && cursor >= startDate) {
        occurrences.push(formatDDMMYYYY(cursor));
      }
      cursor = addMonth(cursor);
    }
  }

  return occurrences;
}

/**
 * Returns all occurrence dates (DD/MM/YYYY) for a recurring entry that fall
 * within [fromDate, toDate] inclusive.
 */
export function expandRecurringEntry(
  entry: DbEntry,
  fromDate: Date,
  toDate: Date,
): string[] {
  const rule = parseRule(entry.recurrence_rule);
  if (!rule) return [];

  const startStr = entry.scheduled_date ?? entry.due_date;
  if (!startStr) return [];

  return expandCadence(
    { rule, startDate: startStr, endDate: entry.recurrence_end_date },
    fromDate,
    toDate,
  );
}

/**
 * A habit's occurrence dates (DD/MM/YYYY) within [fromDate, toDate]. Habits are
 * not entries, so this reads the habit's own cadence columns rather than
 * pretending it is one.
 */
export function expandHabitCadence(
  habit: DbHabit,
  fromDate: Date,
  toDate: Date,
): string[] {
  const rule = parseRule(habit.cadence);
  if (!rule) return [];

  return expandCadence(
    { rule, startDate: habit.start_date, endDate: habit.end_date },
    fromDate,
    toDate,
  );
}

// ─── Effective status ─────────────────────────────────────────────────────────

/**
 * Returns the effective status for a specific recurring instance.
 * A per-instance completion overrides the master entry's status.
 */
export function getEffectiveStatus(
  entry: DbEntry,
  instanceDate: string,
  completionsByKey: Map<string, DbRecurrenceCompletion>,
): DbEntry["status"] {
  const key = `${entry.id}::${instanceDate}`;
  const completion = completionsByKey.get(key);
  if (completion) return completion.status as DbEntry["status"];
  return entry.status;
}

// ─── Build instances ──────────────────────────────────────────────────────────

/**
 * Expands all recurring entries in the list into RecurringInstance objects
 * for the given date window.
 */
export function buildRecurringInstances(
  entries: DbEntry[],
  completions: DbRecurrenceCompletion[],
  fromDate: Date,
  toDate: Date,
): RecurringInstance[] {
  // Build a lookup map: "entryId::instanceDate" → completion
  const completionsByKey = new Map<string, DbRecurrenceCompletion>();
  for (const c of completions) {
    completionsByKey.set(`${c.entry_id}::${c.instance_date}`, c);
  }

  const instances: RecurringInstance[] = [];

  for (const entry of entries) {
    if (!isRecurringEntry(entry)) continue;
    const dates = expandRecurringEntry(entry, fromDate, toDate);
    for (const instanceDate of dates) {
      const key = `${entry.id}::${instanceDate}`;
      const completion = completionsByKey.get(key) ?? null;
      const effectiveStatus = getEffectiveStatus(
        entry,
        instanceDate,
        completionsByKey,
      );
      instances.push({
        entry,
        instanceDate,
        completion,
        effectiveStatus,
        isDone:
          completion?.status === "completed" ||
          completion?.status === "met" ||
          completion?.status === "skipped",
      });
    }
  }

  return instances;
}

// ─── Human-readable description ───────────────────────────────────────────────

const DAY_ABBRS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function humanizeRule(ruleJson: string | null): string {
  const rule = parseRule(ruleJson);
  if (!rule) return "Does not repeat";

  switch (rule.freq) {
    case "daily":
      return "Every day";
    case "weekdays":
      return "Every weekday";
    case "weekly": {
      if (!rule.days || rule.days.length === 0) return "Weekly";
      const sorted = [...rule.days].sort((a, b) => a - b);
      if (sorted.length === 7) return "Every day";
      if (sorted.length === 5 && sorted.every((d) => d >= 1 && d <= 5)) {
        return "Every weekday";
      }
      return sorted.map((d) => DAY_ABBRS[d]).join(", ");
    }
    case "monthly":
      return "Monthly";
    default:
      return "Repeating";
  }
}
