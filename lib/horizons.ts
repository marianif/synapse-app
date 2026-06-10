import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isoWeek from "dayjs/plugin/isoWeek";

import type { DueRange } from "./types";

dayjs.extend(customParseFormat);
dayjs.extend(isoWeek);

/**
 * Deadline horizons: "what do I want to close this week / month / year",
 * instead of a fake precise date. A horizon deadline stores `due_range` plus
 * `due_date` = the window's END date, so every existing sort/heat/notification
 * path keeps working on due_date unchanged. ISO weeks (Mon–Sun), so "this
 * week" ends on Sunday.
 */

export const DUE_RANGES: DueRange[] = ["week", "month", "year"];

/** End of the CURRENT horizon window, as DD/MM/YYYY. */
export function horizonEndDate(range: DueRange, now = dayjs()): string {
  const end =
    range === "week"
      ? now.endOf("isoWeek")
      : range === "month"
        ? now.endOf("month")
        : now.endOf("year");
  return end.format("DD/MM/YYYY");
}

/** Picker / detail copy: "this week" · "this month" · "this year". */
export function horizonLabel(range: DueRange): string {
  switch (range) {
    case "week":
      return "this week";
    case "month":
      return "this month";
    case "year":
      return "this year";
  }
}

/**
 * Trailing mono readout for a horizon stake: the commitment, not a countdown.
 * "by Sun" (week) · "by 30 Jun" (month) · "by Dec" (year); "Nd over" once the
 * window has closed.
 */
export function horizonReadout(range: DueRange, dueDate: string | null): string {
  if (!dueDate) return horizonLabel(range);
  const end = dayjs(dueDate, "DD/MM/YYYY").startOf("day");
  const days = end.diff(dayjs().startOf("day"), "day");
  if (days < 0) return `${Math.abs(days)}d over`;
  switch (range) {
    case "week":
      return `by ${end.format("ddd")}`;
    case "month":
      return `by ${end.format("D MMM")}`;
    case "year":
      return `by ${end.format("MMM")}`;
  }
}

/** Days before the window end at which a horizon deadline turns hot. */
const CLOSING_WINDOW_DAYS: Record<DueRange, number> = {
  week: 2,
  month: 7,
  year: 30,
};

/**
 * Horizon heat: a committed window is never cool — it idles WARM and turns HOT
 * as the window closes (week: last 2 days; month: last week; year: last month)
 * or once it's overdue.
 */
export function horizonHeat(
  range: DueRange,
  daysUntilEnd: number | null,
): "hot" | "warm" | "cool" {
  if (daysUntilEnd === null) return "warm";
  return daysUntilEnd <= CLOSING_WINDOW_DAYS[range] ? "hot" : "warm";
}
