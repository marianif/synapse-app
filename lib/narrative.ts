import dayjs from "dayjs";

import { isPromotedIdea } from "./taxonomy";
import type { DbDiaryEntry, DbEntry } from "./types";

/**
 * The narrative engine — the agenda voice, generated deterministically from
 * the data. No AI: plain template lines, stated as observational facts about
 * time. The voice may hold you accountable; it may not shame, nag, comfort,
 * or celebrate (PRODUCT.md, principle 5).
 *
 * Narrative is a LAYER, never a curtain (principle 1): these lines reference
 * items that all remain visible and tappable in the zones below.
 */

export type NarrativeKind = "diary-trace" | "waiting" | "stale-idea";

export interface NarrativeLine {
  id: string;
  kind: NarrativeKind;
  text: string;
  /** Tap target: an entry to open, or the diary tab for a trace line. */
  target:
    | { kind: "entry"; entryId: string; entryType: DbEntry["type"] }
    | { kind: "diary" }
    | null;
}

/** Days an item must sit untouched before the voice mentions it. Kept high so
 *  the lines stay rare — rarity is what keeps them noticed. */
const WAITING_THRESHOLD_DAYS = 7;
const STALE_IDEA_THRESHOLD_DAYS = 7;
/** Narrative stays a layer: at most this many lines, one per kind. */
const MAX_LINES = 3;

function daysSince(epochSeconds: number, now: dayjs.Dayjs): number {
  return now.startOf("day").diff(dayjs(epochSeconds * 1000).startOf("day"), "day");
}

function agoPhrase(days: number): string {
  if (days < 14) return "A week ago";
  if (days < 21) return "Two weeks ago";
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function snippet(text: string, max = 48): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max).trimEnd()}…`;
}

const isDone = (e: DbEntry): boolean =>
  e.status === "completed" || e.status === "met";

/**
 * Build the agenda lines for the home narrative block. Deterministic for a
 * given (entries, diaryEntries, now). Order: yesterday's trace, the
 * longest-waiting deadline, the oldest unpromoted idea.
 */
export function buildNarrative(
  entries: DbEntry[],
  diaryEntries: DbDiaryEntry[],
  nowMs: number,
): NarrativeLine[] {
  const now = dayjs(nowMs);
  const lines: NarrativeLine[] = [];

  // Yesterday's diary trace — the latest note written yesterday.
  const yesterdayNote = diaryEntries
    .filter((n) => daysSince(n.created_at, now) === 1)
    .sort((a, b) => b.created_at - a.created_at)[0];
  if (yesterdayNote) {
    lines.push({
      id: `trace-${yesterdayNote.id}`,
      kind: "diary-trace",
      text: `Yesterday you wrote about “${snippet(yesterdayNote.body)}”.`,
      target: { kind: "diary" },
    });
  }

  // The longest-waiting open deadline — a fact about time, not a scolding.
  const waiting = entries
    .filter(
      (e) =>
        e.type === "deadline" &&
        !isDone(e) &&
        daysSince(e.created_at, now) >= WAITING_THRESHOLD_DAYS,
    )
    .sort((a, b) => a.created_at - b.created_at)[0];
  if (waiting) {
    const days = daysSince(waiting.created_at, now);
    lines.push({
      id: `waiting-${waiting.id}`,
      kind: "waiting",
      text: `“${snippet(waiting.title)}” has been waiting ${days} days.`,
      target: { kind: "entry", entryId: waiting.id, entryType: waiting.type },
    });
  }

  // The oldest idea never promoted to a project — an open door, not a chore.
  const stale = entries
    .filter(
      (e) =>
        e.type === "idea" &&
        !isDone(e) &&
        !isPromotedIdea(e) &&
        daysSince(e.created_at, now) >= STALE_IDEA_THRESHOLD_DAYS,
    )
    .sort((a, b) => a.created_at - b.created_at)[0];
  if (stale) {
    const days = daysSince(stale.created_at, now);
    lines.push({
      id: `stale-${stale.id}`,
      kind: "stale-idea",
      text: `${agoPhrase(days)} you sketched “${snippet(stale.title)}”. Worth a second look?`,
      target: { kind: "entry", entryId: stale.id, entryType: stale.type },
    });
  }

  return lines.slice(0, MAX_LINES);
}
