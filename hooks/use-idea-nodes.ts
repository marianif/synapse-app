import dayjs from "dayjs";
import { useMemo } from "react";

import type { DbDiaryEntry, DbEntry } from "@/lib/types";

/** Heat state derived from `daysSinceActivity`. Drives fill vs. hollow, opacity,
 *  and the stale-pulse ring on a node. */
export type IdeaHeat = "fresh" | "warm" | "silent" | "stale";

export interface IdeaNode {
  id: string;
  title: string;
  /** Unix seconds — MAX(idea.created_at, latest linked note.created_at). */
  lastActivityAt: number;
  /** Whole days between now and `lastActivityAt`. Floor. */
  daysSinceActivity: number;
  noteCount: number;
  heat: IdeaHeat;
}

const DAY = 86_400;

function heatFor(daysSince: number): IdeaHeat {
  if (daysSince <= 7) return "fresh";
  if (daysSince <= 30) return "warm";
  if (daysSince <= 60) return "silent";
  return "stale";
}

/**
 * Given the entries store and the diary store, return the idea nodes to draw
 * in the constellation. Ideas only — todos and deadlines never enter this graph.
 */
export function useIdeaNodes(
  entries: readonly DbEntry[],
  notes: readonly DbDiaryEntry[],
  nowSeconds: number,
): IdeaNode[] {
  return useMemo(() => {
    const notesByIdea = new Map<string, DbDiaryEntry[]>();
    for (const n of notes) {
      if (!n.linked_entry_id) continue;
      const list = notesByIdea.get(n.linked_entry_id);
      if (list) list.push(n);
      else notesByIdea.set(n.linked_entry_id, [n]);
    }

    const nodes: IdeaNode[] = [];
    for (const e of entries) {
      if (e.type !== "idea") continue;
      const linked = notesByIdea.get(e.id) ?? [];
      let latestNoteAt = 0;
      for (const n of linked) {
        if (n.created_at > latestNoteAt) latestNoteAt = n.created_at;
      }
      const lastActivityAt = Math.max(e.created_at, latestNoteAt);
      const daysSinceActivity = Math.max(
        0,
        Math.floor((nowSeconds - lastActivityAt) / DAY),
      );
      nodes.push({
        id: e.id,
        title: e.title,
        lastActivityAt,
        daysSinceActivity,
        noteCount: linked.length,
        heat: heatFor(daysSinceActivity),
      });
    }
    return nodes;
  }, [entries, notes, nowSeconds]);
}

/** Round `now` down to the current minute so `useMemo` doesn't thrash on every
 *  render just because the second ticked. Caller passes this into `useIdeaNodes`. */
export function nowFloorMinute(): number {
  return Math.floor(dayjs().unix() / 60) * 60;
}
