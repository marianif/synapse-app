import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import { daysUntil } from "@/lib/direct-when";
import { horizonLabel } from "@/lib/horizons";

import type {
  DbDiaryEntry,
  DbEntry,
  DbProject,
  DbTask,
  EntryType,
} from "@/lib/types";

dayjs.extend(customParseFormat);

/**
 * The agenda voice: the board reading itself back to you as a feed of
 * observations about TIME. Not another list of entries — the Field already
 * shows you WHAT is on the board; this says what has HAPPENED to it.
 *
 * Everything here is pure. Each dispatch is derived at render from rows you
 * already have (entries, tasks, diary, projects) — no new table, no cron, no
 * model call. The screen re-reads the board and the board talks.
 *
 * VOICE RULES (PRODUCT.md — "speak in your own handwriting"):
 *  • States facts about time. May hold you accountable.
 *  • Never shames, nags, comforts, or celebrates.
 *  • The scaffolding is muted grotesk; only the THING (the entry title, or the
 *    number when the number IS the point) is lifted into the hand + type color.
 *    A whole sentence in Caveat would be data in a scrawl — DESIGN.md forbids
 *    it, and it stops being scannable at 2x font scale.
 */

// ── Segments ──────────────────────────────────────────────────────────────────

/**
 * One piece of a spoken line. A bare `text` segment is muted scaffolding; a
 * segment with `lift: true` is the meaningful bit — rendered in Caveat and the
 * dispatch's type color. Same shape the field console's FocusLine speaks in, so
 * the two surfaces stay one voice.
 */
export type Segment = { text: string; lift?: boolean };

const say = (text: string): Segment => ({ text });
const lift = (text: string): Segment => ({ text, lift: true });

// ── Dispatch ──────────────────────────────────────────────────────────────────

/**
 * What a dispatch points AT when tapped. The feed is a pointer into the board,
 * never a dead end: every line opens the thing it is talking about.
 */
export type DispatchTarget =
  | { kind: "entry"; id: string }
  | { kind: "project"; id: string }
  | { kind: "note"; id: string };

/**
 * The channel a line speaks on. Drives the dot color and the mono kicker, so
 * the eye can sort the feed by type before reading a word. A diary trace has no
 * entry type — it speaks on the neutral `note` channel.
 */
export type DispatchChannel = EntryType | "note";

export interface Dispatch {
  /** Stable across re-scores so the FlatList and its entrance don't thrash. */
  id: string;
  channel: DispatchChannel;
  /** The line itself: muted scaffolding + lifted things. */
  segments: Segment[];
  /** Mono footer, left half — the channel name. */
  kicker: string;
  /** Mono footer, right half — the project, or the free-standing marker. */
  context: string;
  /** What a tap opens. */
  target: DispatchTarget;
  /**
   * Rank weight. Higher = louder, and louder floats up. This is a RANKING, not
   * a filter: the Field still holds the whole board, so ordering the voice by
   * heat hides nothing (PRODUCT.md principle 2 stays intact).
   */
  weight: number;
}

// ── Tuning ────────────────────────────────────────────────────────────────────

/** An idea nobody has touched in this long has gone quiet. */
const IDEA_STALE_DAYS = 7;
/** A checklist that hasn't moved in this long has frozen. */
const CHECKLIST_FROZEN_DAYS = 3;
/** A project with no movement at all in this long has gone dark. */
const PROJECT_QUIET_DAYS = 14;
/** A diary note this fresh is still a trace of last night. */
const NOTE_FRESH_HOURS = 48;
/** The feed's depth. Past this the voice is repeating itself. */
const MAX_DISPATCHES = 14;

const DAY_MS = 86_400_000;
const CONTEXT_FREE = "free-standing";

/** Whole days since a ms timestamp, floored. */
function daysSince(ts: number, now: number): number {
  return Math.floor((now - ts) / DAY_MS);
}

/** "a week" reads better than "7 days"; past a fortnight, weeks read better. */
function span(days: number): string {
  if (days <= 1) return "a day";
  if (days < 7) return `${days} days`;
  if (days < 14) return "a week";
  if (days < 30) return `${Math.floor(days / 7)} weeks`;
  if (days < 60) return "a month";
  return `${Math.floor(days / 30)} months`;
}

/** The project's name for the mono footer, or the free-standing marker. */
function contextOf(
  projectId: string | null,
  projects: DbProject[],
): string {
  if (!projectId) return CONTEXT_FREE;
  return projects.find((p) => p.id === projectId)?.title ?? CONTEXT_FREE;
}

const isDone = (e: DbEntry): boolean =>
  e.status === "completed" || e.status === "met";

// ── Channels ──────────────────────────────────────────────────────────────────
//
// Each builder is one reading of the board. They run independently over the same
// rows and pool their lines; `agendaVoice` ranks and cuts the pool at the end.

/**
 * A dated deadline or todo, overdue or closing in. The number of days IS the
 * point here, so it takes the lift alongside the title when it has run out.
 */
function timeDispatches(
  entries: DbEntry[],
  projects: DbProject[],
): Dispatch[] {
  const out: Dispatch[] = [];

  for (const e of entries) {
    if (isDone(e)) continue;

    const dateStr = e.due_date ?? e.scheduled_date ?? null;
    const days = daysUntil(dateStr);
    if (days === null) continue;

    // Only speak about what's actually pressing: overdue, or inside a week.
    if (days > 6) continue;

    const kicker = e.type === "deadline" ? "DEADLINE" : "TODO";
    const base = {
      id: `time-${e.id}`,
      channel: e.type as DispatchChannel,
      kicker,
      context: contextOf(e.project_id, projects),
      target: { kind: "entry" as const, id: e.id },
    };

    if (days < 0) {
      const over = Math.abs(days);
      out.push({
        ...base,
        // Overdue and undone is the loudest thing the board can say.
        weight: 1000 + over,
        segments: [
          lift(e.title),
          say(" ran out "),
          lift(span(over)),
          say(" ago."),
        ],
      });
    } else if (e.due_range) {
      // A horizon: the window is closing, and the window is the news.
      out.push({
        ...base,
        weight: 600 - days,
        segments: [
          lift(e.title),
          say(` closes ${horizonLabel(e.due_range)} — `),
          lift(days === 0 ? "today" : span(days)),
          say(days === 0 ? "." : " left."),
        ],
      });
    } else {
      const when =
        days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${span(days)}`;
      out.push({
        ...base,
        weight: 700 - days * 10,
        segments: [lift(e.title), say(` is due ${when}.`)],
      });
    }
  }

  return out;
}

/**
 * An idea that was captured and then left. Unpromoted and untouched — the board
 * remembers it so you don't have to. The one thing here that resurfaces purely
 * because time passed, which is the whole reason this app exists.
 */
function ideaDispatches(
  entries: DbEntry[],
  projects: DbProject[],
  now: number,
): Dispatch[] {
  const out: Dispatch[] = [];

  for (const e of entries) {
    if (e.type !== "idea" || isDone(e)) continue;
    if (e.promoted_project_id) continue; // it went somewhere; stop nagging

    const idle = daysSince(e.updated_at, now);
    if (idle < IDEA_STALE_DAYS) continue;

    out.push({
      id: `idea-${e.id}`,
      channel: "idea",
      // The older it gets the more it deserves the top, but an idea never
      // outranks something that has actually run out.
      weight: 300 + Math.min(idle, 90),
      segments: [
        lift(e.title),
        say(" has sat for "),
        lift(span(idle)),
        say(", still nowhere."),
      ],
      kicker: "IDEA",
      context: contextOf(e.project_id, projects),
      target: { kind: "entry", id: e.id },
    });
  }

  return out;
}

/**
 * A checklist you started and stopped. Progress ("3 of 5") is the news, so the
 * fraction takes the lift — it's the number that tells you where you left off.
 */
function checklistDispatches(
  entries: DbEntry[],
  tasks: DbTask[],
  projects: DbProject[],
  now: number,
): Dispatch[] {
  const out: Dispatch[] = [];

  for (const e of entries) {
    if (isDone(e)) continue;

    const own = tasks.filter((t) => t.entry_id === e.id);
    if (own.length === 0) continue;

    const done = own.filter((t) => t.done === 1).length;
    // Untouched and finished checklists have nothing to report — a checklist
    // only speaks when it is midway and stopped.
    if (done === 0 || done === own.length) continue;

    const lastMoved = Math.max(...own.map((t) => t.updated_at));
    const idle = daysSince(lastMoved, now);
    if (idle < CHECKLIST_FROZEN_DAYS) continue;

    out.push({
      id: `check-${e.id}`,
      channel: e.type as DispatchChannel,
      weight: 400 + Math.min(idle, 60),
      segments: [
        lift(e.title),
        say(" stopped at "),
        lift(`${done} of ${own.length}`),
        say(`, ${span(idle)} ago.`),
      ],
      kicker: e.type === "deadline" ? "DEADLINE" : "TODO",
      context: contextOf(e.project_id, projects),
      target: { kind: "entry", id: e.id },
    });
  }

  return out;
}

/**
 * Last night's trace. A diary note is never actionable and never reaches the
 * board — but the agenda can still tell you what you were thinking about, and
 * that is often the most honest line on the screen.
 */
function noteDispatches(
  notes: DbDiaryEntry[],
  entries: DbEntry[],
  projects: DbProject[],
  now: number,
): Dispatch[] {
  const out: Dispatch[] = [];
  const freshCutoff = now - NOTE_FRESH_HOURS * 3_600_000;

  for (const n of notes) {
    if (n.created_at < freshCutoff) continue;

    const at = dayjs(n.created_at);
    const when = at.isSame(dayjs(now), "day")
      ? at.format("HH:mm")
      : `last night, ${at.format("HH:mm")}`;

    // A linked note is the interesting case: it says you were circling
    // something the board already knows about.
    const linkedEntry = n.linked_entry_id
      ? entries.find((e) => e.id === n.linked_entry_id)
      : undefined;
    const linkedProject = n.linked_project_id
      ? projects.find((p) => p.id === n.linked_project_id)
      : undefined;

    const subject = linkedEntry?.title ?? linkedProject?.title ?? null;

    out.push({
      id: `note-${n.id}`,
      channel: "note",
      // Fresh traces sit high — this is what you were on hours ago — but never
      // over an overdue thing.
      weight: 500 - Math.floor((now - n.created_at) / 3_600_000),
      segments: subject
        ? [say("You wrote about "), lift(subject), say(` at ${when}.`)]
        : [say(`You put something down at `), lift(when), say(".")],
      kicker: "NOTE",
      context: linkedProject?.title ?? (linkedEntry ? "on an idea" : CONTEXT_FREE),
      target: { kind: "note", id: n.id },
    });
  }

  return out;
}

/**
 * A project nobody has opened and nothing has moved in. The quietest line the
 * board can produce, and the easiest to miss — which is exactly why it belongs
 * in the feed rather than in a badge.
 */
function projectDispatches(
  projects: DbProject[],
  entries: DbEntry[],
  now: number,
): Dispatch[] {
  const out: Dispatch[] = [];

  for (const p of projects) {
    if (p.status !== "active") continue;

    const own = entries.filter((e) => e.project_id === p.id);
    if (own.length === 0) continue; // an empty project has nothing to go quiet

    const open = own.filter((e) => !isDone(e));
    if (open.length === 0) continue; // finished, not abandoned

    const lastMove = Math.max(
      p.last_opened_at ?? 0,
      p.updated_at,
      ...own.map((e) => e.updated_at),
    );
    const idle = daysSince(lastMove, now);
    if (idle < PROJECT_QUIET_DAYS) continue;

    out.push({
      id: `proj-${p.id}`,
      channel: "note", // neutral — a project is not an entry type
      weight: 200 + Math.min(idle, 90),
      segments: [
        lift(p.title),
        say(" hasn't moved in "),
        lift(span(idle)),
        say(`, with ${open.length} open.`),
      ],
      kicker: "PROJECT",
      context: `${open.length} open`,
      target: { kind: "project", id: p.id },
    });
  }

  return out;
}

// ── The feed ──────────────────────────────────────────────────────────────────

/**
 * Read the whole board and speak it: every channel runs, the pool is ranked by
 * weight (loudest first), one line per subject, cut at MAX_DISPATCHES.
 *
 * The de-dupe matters: an overdue deadline with a frozen checklist would
 * otherwise say the same thing twice in two voices. The loudest reading of a
 * given entry wins and the rest go quiet.
 *
 * `now` is passed in (never `Date.now()` in here) so the caller anchors it once
 * per mount and the feed stays stable across re-renders.
 */
export function agendaVoice(input: {
  entries: DbEntry[];
  tasks: DbTask[];
  notes: DbDiaryEntry[];
  projects: DbProject[];
  now: number;
}): Dispatch[] {
  const { entries, tasks, notes, projects, now } = input;

  const pool = [
    ...timeDispatches(entries, projects),
    ...checklistDispatches(entries, tasks, projects, now),
    ...noteDispatches(notes, entries, projects, now),
    ...ideaDispatches(entries, projects, now),
    ...projectDispatches(projects, entries, now),
  ].sort((a, b) => b.weight - a.weight);

  // One line per subject — the loudest reading of a thing is the only reading.
  const spoken = new Set<string>();
  const feed: Dispatch[] = [];

  for (const d of pool) {
    const subject = `${d.target.kind}:${d.target.id}`;
    if (spoken.has(subject)) continue;
    spoken.add(subject);
    feed.push(d);
    if (feed.length === MAX_DISPATCHES) break;
  }

  return feed;
}
