import dayjs from "dayjs";

import { isPromotedIdea } from "./taxonomy";
import type { DbEntry, DbProject } from "./types";

/**
 * The narrative engine — the agenda voice, generated deterministically from
 * the data. No AI: plain template lines, stated as observational facts about
 * time. The voice may hold you accountable; it may not shame, nag, comfort,
 * or celebrate (PRODUCT.md, principle 5).
 *
 * Scope is deliberately narrow: this layer speaks ONLY about projects and
 * ideas — the macro things the user was last *working on*. It is a fast hit of
 * re-recognition for an out-of-sight-out-of-mind brain ("oh right, that"), not
 * a status board. Deadlines, todos, events and diary traces are NOT its job;
 * they live in the direct zones below. Narrative is a layer, never a curtain
 * (principle 1): every line references an item that stays visible and tappable.
 */

export type NarrativeKind = "project" | "idea";

/** A line's accent — the voice is multicolor: projects and ideas glow apart. */
export type NarrativeAccent = "project" | "idea";

export interface NarrativeLine {
  id: string;
  kind: NarrativeKind;
  /** Plain narrative text — the connective tissue, rendered in ink. */
  text: string;
  /** The named thing inside the line, lifted in its own accent color. */
  subject: string;
  /** Which accent the subject glows in. */
  accent: NarrativeAccent;
  /** Tap target: the project or idea this line is about. */
  target:
    | { kind: "project"; projectId: string }
    | { kind: "entry"; entryId: string; entryType: DbEntry["type"] };
}

/** At most this many lines — rarity is what keeps them noticed. */
const MAX_LINES = 3;

function daysSince(epochSeconds: number, now: dayjs.Dayjs): number {
  return now.startOf("day").diff(dayjs(epochSeconds * 1000).startOf("day"), "day");
}

/** "today" / "yesterday" / "N days ago" / "a while back" — soft, factual. */
function lastTouchedPhrase(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "last week";
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return "a while back";
}

function snippet(text: string, max = 42): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max).trimEnd()}…`;
}

const isDone = (e: DbEntry): boolean =>
  e.status === "completed" || e.status === "met";

/** Most recent of an entry's create/update stamps — when it was last *touched*. */
function lastTouched(e: DbEntry): number {
  return Math.max(e.created_at, e.updated_at);
}

/**
 * Build the agenda lines — projects and ideas only, ordered by recency of
 * work so the things most recently in-hand surface first. Deterministic for a
 * given (entries, projects, now).
 *
 * Projects lead (they're the macro context), then loose ideas you haven't
 * promoted yet. Each line carries its own accent so the block reads multicolor.
 */
export function buildNarrative(
  entries: DbEntry[],
  projects: DbProject[],
  nowMs: number,
): NarrativeLine[] {
  const now = dayjs(nowMs);

  // When each project was last worked on = the newest touch across its entries
  // (falling back to the project's own updated_at if nothing's filed under it).
  const lastWorkByProject = new Map<string, number>();
  for (const e of entries) {
    if (!e.project_id) continue;
    const prev = lastWorkByProject.get(e.project_id) ?? 0;
    lastWorkByProject.set(e.project_id, Math.max(prev, lastTouched(e)));
  }

  const projectLines: NarrativeLine[] = projects
    .filter((p) => p.status === "active")
    .map((p) => ({
      project: p,
      touched: lastWorkByProject.get(p.id) ?? p.updated_at,
    }))
    .sort((a, b) => b.touched - a.touched)
    .map(({ project, touched }) => {
      const phrase = lastTouchedPhrase(daysSince(touched, now));
      return {
        id: `project-${project.id}`,
        kind: "project" as const,
        text: `You were building __ ${phrase}.`,
        subject: snippet(project.title),
        accent: "project" as const,
        target: { kind: "project" as const, projectId: project.id },
      };
    });

  // Loose ideas — open, not yet promoted into a project — newest-worked first.
  // These are the sketches still waiting for a second look.
  const ideaLines: NarrativeLine[] = entries
    .filter((e) => e.type === "idea" && !isDone(e) && !isPromotedIdea(e))
    .sort((a, b) => lastTouched(b) - lastTouched(a))
    .map((e) => ({
      id: `idea-${e.id}`,
      kind: "idea" as const,
      text: `__ — still worth a look.`,
      subject: snippet(e.title),
      accent: "idea" as const,
      target: { kind: "entry" as const, entryId: e.id, entryType: e.type },
    }));

  // Projects lead, ideas fill the remainder, capped so the layer stays thin.
  return [...projectLines, ...ideaLines].slice(0, MAX_LINES);
}
