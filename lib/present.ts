// Present-zone model — ideas / someday / events. A categorically different kind
// of information from Stakes: no edge, no ranking. The signal here is FRESHNESS
// (how recently you touched a thing), because the enemy is forgetting, not
// lateness. Nothing is ever hidden by neglect — it only dims to a ghost.

import type { DbEntry, EntryType } from "@/lib/types";

/** How alive a present thing is, by time since last touch. Drives brightness/size. */
export type Bucket = "fresh" | "settling" | "fading";

export interface PresentItem {
  id: string;
  type: EntryType;
  title: string;
  /** Quiet context label — an event's day, or "" for undated ideas/somedays. */
  note?: string;
  /** 0 = long forgotten (ghost), 1 = just captured/edited. Continuous. */
  freshness: number;
  bucket: Bucket;
  /** Whole-day age since last touch — for "5d" style hints if a variant wants it. */
  ageDays: number;
  /** Diary notes filed on this entry (ideas only). 0 / absent → no badge. */
  noteCount?: number;
}

const DAY_MS = 86_400_000;
// Freshness fully decays over ~3 weeks of no contact, then floors at a visible ghost.
const DECAY_DAYS = 21;
const FLOOR = 0.12;

function bucketFor(ageDays: number): Bucket {
  if (ageDays <= 2) return "fresh";
  if (ageDays <= 10) return "settling";
  return "fading";
}

/**
 * Map an entry to its present-model shape. `now` is injected so callers can
 * memoize against a stable timestamp (no Date.now() inside render paths).
 */
export function toPresentItem(
  e: DbEntry,
  now: number,
  noteCount = 0,
): PresentItem {
  const touched = e.updated_at || e.created_at || now;
  const ageDays = Math.max(0, Math.floor((now - touched) / DAY_MS));
  const raw = 1 - ageDays / DECAY_DAYS;
  const freshness = Math.max(FLOOR, Math.min(1, raw));
  return {
    id: e.id,
    type: e.type as EntryType,
    title: e.title,
    note: presentNote(e),
    freshness,
    bucket: bucketFor(ageDays),
    ageDays,
    noteCount,
  };
}

/** Events carry a date; ideas/somedays don't. Surface it only as a quiet label. */
function presentNote(e: DbEntry): string | undefined {
  if (e.type === "event") {
    const d = e.scheduled_date ?? e.due_date;
    if (d) return d; // formatted by the variant if it wants to
  }
  return undefined;
}

/**
 * Build the present field, freshest first. Order is a soft default for layout,
 * NOT a ranking — variants are free to lay items out spatially however they read
 * best (a cloud, lanes, a stack).
 */
export function toPresentItems(
  entries: DbEntry[],
  now: number,
  /** entryId → diary-note count, for the "N notes" badge on idea chips. */
  noteCounts?: Record<string, number>,
): PresentItem[] {
  return entries
    .map((e) => toPresentItem(e, now, noteCounts?.[e.id] ?? 0))
    .sort((a, b) => b.freshness - a.freshness);
}
