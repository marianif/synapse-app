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
 * observations about TIME. The Field shows you WHAT is on the board; this says
 * what has HAPPENED to it — and, crucially, what the items are doing TO EACH
 * OTHER. A feed of isolated "X is due tomorrow" lines is just a sorted list
 * wearing handwriting; the voice earns its tab only when it can see across the
 * board (three deadlines colliding, a project going dark while another eats
 * your attention, nothing closing for nine days).
 *
 * Everything here is pure. Every dispatch derives at render from rows you
 * already have — no new table, no cron, no model call. The screen re-reads the
 * board and the board talks.
 *
 * VOICE RULES (PRODUCT.md — "speak in your own handwriting"):
 *  • States facts about time. May hold you accountable.
 *  • Never shames, nags, comforts, or celebrates.
 *  • ONE lift per line — the subject, in the hand. Numbers are the instrument
 *    layer (mono, type-colored), never handwritten. Three registers, three
 *    jobs: hand = the thing, mono = the measure, grotesk = the sentence.
 *  • Phrasing varies per subject (stable hash), so the same board never reads
 *    identically twice and four "is due" lines never stack.
 */

// ── Timestamps ────────────────────────────────────────────────────────────────

/**
 * The DB stores `created_at`/`updated_at` in SECONDS (SQLite `strftime('%s')`),
 * but `projects.last_opened_at` is written in MILLISECONDS (`Date.now()`). Mixing
 * the two produced ages like "687 months". Normalize every timestamp to ms at
 * the boundary and never think about units again.
 *
 * The threshold: any value below ~1e11 cannot be a plausible ms epoch (1e11 ms
 * is 1973), so it must be seconds.
 */
const MS_THRESHOLD = 1e11;

function toMs(ts: number | null): number | null {
  if (ts === null || ts === 0) return null;
  return ts < MS_THRESHOLD ? ts * 1000 : ts;
}

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/** Whole days since a timestamp of unknown unit. Null when never stamped. */
function daysSince(ts: number | null, now: number): number | null {
  const ms = toMs(ts);
  if (ms === null) return null;
  return Math.max(0, Math.floor((now - ms) / DAY_MS));
}

/** Whole hours since a timestamp of unknown unit. Null when never stamped. */
function hoursSince(ts: number | null, now: number): number | null {
  const ms = toMs(ts);
  if (ms === null) return null;
  return Math.max(0, Math.floor((now - ms) / HOUR_MS));
}

// ── Segments ──────────────────────────────────────────────────────────────────

/**
 * One piece of a spoken line, in one of three registers:
 *
 *   • plain   — muted grotesk. The sentence's connective tissue.
 *   • lift    — Caveat, type-colored. THE SUBJECT. Exactly one per dispatch.
 *   • measure — mono, type-colored. A number, a span, a count. The instrument
 *               layer, reused from the count/kicker voice already in the app.
 *
 * Keeping the number OUT of the hand is what stops the line from turning into
 * two competing headlines with a sentence trapped between them.
 */
export type SegmentKind = "plain" | "lift" | "measure";
export type Segment = { text: string; kind: SegmentKind };

const say = (text: string): Segment => ({ text, kind: "plain" });
const lift = (text: string): Segment => ({ text, kind: "lift" });
const measure = (text: string): Segment => ({ text, kind: "measure" });

// ── Dispatch ──────────────────────────────────────────────────────────────────

export type DispatchTarget =
  | { kind: "entry"; id: string }
  | { kind: "project"; id: string }
  | { kind: "note"; id: string }
  | { kind: "board" };

/** The channel a line speaks on — drives the dot color and the mono kicker. */
export type DispatchChannel = EntryType | "note" | "board";

/**
 * Which generator produced a line. Used to de-stack the feed: three near-
 * identical "is due" rows in a row is the failure mode this whole file exists
 * to avoid.
 */
export type DispatchSource =
  | "overdue"
  | "due"
  | "horizon"
  | "collision"
  | "frozen"
  | "stale-idea"
  | "graduating"
  | "displaced"
  | "heavy"
  | "quiet"
  | "silence"
  | "orphans"
  | "note-fresh"
  | "note-pattern"
  | "echo";

export interface Dispatch {
  id: string;
  channel: DispatchChannel;
  source: DispatchSource;
  segments: Segment[];
  /** Mono footer, left half — the channel name. */
  kicker: string;
  /** Mono footer, right half — where this lives. */
  context: string;
  target: DispatchTarget;
  /** Higher = louder = higher up. A ranking, never a filter. */
  weight: number;
  /**
   * Hot lines (something has run out, something is colliding) breathe wider.
   * NOT a color change — Equal Volume holds, every type glows the same. Only
   * the SPACE varies, so the eye finds the pressure without a type being dimmed.
   */
  heat: "hot" | "calm";
}

// ── Tuning ────────────────────────────────────────────────────────────────────

const IDEA_STALE_DAYS = 7;
const IDEA_GRADUATE_DAYS = 21;
const CHECKLIST_FROZEN_DAYS = 3;
const PROJECT_QUIET_DAYS = 10;
const NOTE_FRESH_HOURS = 36;
const ECHO_HOURS = 6;
const SILENCE_DAYS = 5;
const ORPHAN_MIN = 5;
const HEAVY_SHARE = 0.5;
const COLLISION_MIN = 3;
const MAX_DISPATCHES = 16;
/** No more than this many lines in a row from the same generator. */
const MAX_RUN = 2;

const CONTEXT_FREE = "free-standing";

// ── Phrasing ──────────────────────────────────────────────────────────────────

/**
 * A stable per-subject hash. Picking a phrasing variant with this (rather than
 * randomly) means the same item says the same thing every time you open the
 * app — the voice has a memory, it isn't shuffling. But two different items in
 * the same state phrase differently, so the feed never reads as a filled-in
 * template.
 */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Pick one of N phrasings, stably, for this subject. */
function pick<T>(variants: T[], seed: string): T {
  return variants[hash(seed) % variants.length];
}

/** "a week" reads better than "7 days"; past a fortnight, weeks read better. */
function span(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "a day";
  if (days < 7) return `${days} days`;
  if (days < 14) return "a week";
  if (days < 31) return `${Math.floor(days / 7)} weeks`;
  if (days < 60) return "a month";
  if (days < 365) return `${Math.floor(days / 30)} months`;
  return "over a year";
}

function contextOf(projectId: string | null, projects: DbProject[]): string {
  if (!projectId) return CONTEXT_FREE;
  return projects.find((p) => p.id === projectId)?.title ?? CONTEXT_FREE;
}

const isDone = (e: DbEntry): boolean =>
  e.status === "completed" || e.status === "met";

const KICKER: Record<EntryType, string> = {
  deadline: "DEADLINE",
  todo: "TODO",
  idea: "IDEA",
};

/** The last time anything at all happened to an entry. */
function lastTouch(e: DbEntry): number {
  return Math.max(toMs(e.updated_at) ?? 0, toMs(e.created_at) ?? 0);
}

// ── Channel: the clock ────────────────────────────────────────────────────────

/**
 * Dated things, overdue or closing in. The three phrasings per state are what
 * keep four due-today items from reading as four copies of one row.
 */
function clockDispatches(entries: DbEntry[], projects: DbProject[]): Dispatch[] {
  const out: Dispatch[] = [];

  for (const e of entries) {
    if (isDone(e)) continue;

    const dateStr = e.due_date ?? e.scheduled_date ?? null;
    const days = daysUntil(dateStr);
    if (days === null || days > 6) continue; // only what's actually pressing

    const type = e.type as EntryType;
    const base = {
      id: `clock-${e.id}`,
      channel: type as DispatchChannel,
      kicker: KICKER[type],
      context: contextOf(e.project_id, projects),
      target: { kind: "entry" as const, id: e.id },
    };

    if (days < 0) {
      const over = Math.abs(days);
      out.push({
        ...base,
        source: "overdue",
        heat: "hot",
        weight: 1000 + over,
        segments: pick(
          [
            [lift(e.title), say(" ran out "), measure(span(over)), say(" ago.")],
            [lift(e.title), say(" is "), measure(span(over)), say(" past its date.")],
            [
              say("You are "),
              measure(span(over)),
              say(" late on "),
              lift(e.title),
              say("."),
            ],
          ],
          e.id,
        ),
      });
      continue;
    }

    if (e.due_range) {
      out.push({
        ...base,
        source: "horizon",
        heat: days <= 2 ? "hot" : "calm",
        weight: 600 - days,
        segments: pick(
          [
            [
              lift(e.title),
              say(` closes ${horizonLabel(e.due_range)} — `),
              measure(days === 0 ? "today" : `${days}d`),
              say(" left."),
            ],
            [
              say(`${horizonLabel(e.due_range)} has `),
              measure(days === 0 ? "no days" : `${days} days`),
              say(" left in it, and "),
              lift(e.title),
              say(" is still open."),
            ],
          ],
          e.id,
        ),
      });
      continue;
    }

    const when = days === 0 ? "today" : days === 1 ? "tomorrow" : `${days}d`;
    out.push({
      ...base,
      source: "due",
      heat: days <= 1 ? "hot" : "calm",
      weight: 700 - days * 10,
      segments: pick(
        [
          [lift(e.title), say(" is due "), measure(when), say(".")],
          [
            say(days <= 1 ? "It's " : "In "),
            measure(when),
            say(": "),
            lift(e.title),
            say("."),
          ],
          [lift(e.title), say(" lands "), measure(when), say(".")],
        ],
        e.id,
      ),
    });
  }

  return out;
}

/**
 * COLLISION — three or more dated things landing inside the next seven days.
 * This is the line a sorted list physically cannot produce: it is about the
 * SHAPE of the week, not about any one item.
 *
 * The window is ROLLING (the next 7 days), not the calendar week. A calendar
 * week would collapse to nothing every Sunday — and "you have four things left
 * this week" is a useless thing to hear on a Sunday evening. What the user
 * actually feels is the pile-up ahead of them, which doesn't reset at midnight
 * on Sunday.
 */
function collisionDispatches(entries: DbEntry[]): Dispatch[] {
  const landing = entries.filter((e) => {
    if (isDone(e)) return false;
    const days = daysUntil(e.due_date ?? e.scheduled_date ?? null);
    return days !== null && days >= 0 && days <= 6;
  });

  if (landing.length < COLLISION_MIN) return [];

  const deadlines = landing.filter((e) => e.type === "deadline").length;
  const allDeadlines = deadlines === landing.length;

  return [
    {
      id: "collision-week",
      channel: allDeadlines ? "deadline" : "board",
      source: "collision",
      heat: "hot",
      weight: 900,
      segments: [
        measure(`${landing.length} things`),
        say(" land in the next seven days"),
        ...(deadlines >= 2 && !allDeadlines
          ? [say(", "), measure(`${deadlines}`), say(" of them deadlines.")]
          : [say(".")]),
      ],
      kicker: "COLLISION",
      context: "next 7 days",
      target: { kind: "board" },
    },
  ];
}

// ── Channel: things going quiet ───────────────────────────────────────────────

/**
 * An idea captured and then left. The one thing here that resurfaces purely
 * because time passed — which is the entire reason this app exists.
 */
function ideaDispatches(
  entries: DbEntry[],
  projects: DbProject[],
  now: number,
): Dispatch[] {
  const out: Dispatch[] = [];

  for (const e of entries) {
    if (e.type !== "idea" || isDone(e) || e.promoted_project_id) continue;

    const idle = daysSince(lastTouch(e), now);
    if (idle === null || idle < IDEA_STALE_DAYS) continue;

    const base = {
      channel: "idea" as const,
      kicker: "IDEA",
      context: contextOf(e.project_id, projects),
      target: { kind: "entry" as const, id: e.id },
    };

    // GRADUATING — an old, unpromoted idea isn't stale, it's oversized. It has
    // outlived the "maybe" phase and is behaving like a project. That's a
    // different fact about the same row, and a more useful one.
    if (idle >= IDEA_GRADUATE_DAYS && !e.project_id) {
      out.push({
        ...base,
        id: `grad-${e.id}`,
        source: "graduating",
        heat: "calm",
        weight: 380 + Math.min(idle, 90),
        segments: pick(
          [
            [
              lift(e.title),
              say(" has survived "),
              measure(span(idle)),
              say(" unfiled. That's a project, not an idea."),
            ],
            [
              lift(e.title),
              say(" keeps not going away — "),
              measure(span(idle)),
              say(" and still autonomous."),
            ],
          ],
          e.id,
        ),
      });
      continue;
    }

    out.push({
      ...base,
      id: `idea-${e.id}`,
      source: "stale-idea",
      heat: "calm",
      weight: 300 + Math.min(idle, 90),
      segments: pick(
        [
          [
            lift(e.title),
            say(" has sat "),
            measure(span(idle)),
            say(", still nowhere."),
          ],
          [
            say("Nothing has happened to "),
            lift(e.title),
            say(" in "),
            measure(span(idle)),
            say("."),
          ],
          [
            lift(e.title),
            say(" was caught "),
            measure(span(idle)),
            say(" ago and left there."),
          ],
        ],
        e.id,
      ),
    });
  }

  return out;
}

/**
 * A checklist you started and stopped. Progress is the news, so the fraction is
 * the measure — it tells you exactly where you put it down.
 */
function frozenDispatches(
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
    // A checklist only speaks when it is MIDWAY and stopped. Untouched has
    // nothing to report; finished is just a todo waiting to be closed.
    if (done === 0 || done === own.length) continue;

    const lastMoved = Math.max(...own.map((t) => toMs(t.updated_at) ?? 0));
    const idle = daysSince(lastMoved, now);
    if (idle === null || idle < CHECKLIST_FROZEN_DAYS) continue;

    const type = e.type as EntryType;
    out.push({
      id: `frozen-${e.id}`,
      channel: type as DispatchChannel,
      source: "frozen",
      heat: "calm",
      weight: 420 + Math.min(idle, 60),
      segments: pick(
        [
          [
            lift(e.title),
            say(" stopped at "),
            measure(`${done} of ${own.length}`),
            say(`, ${span(idle)} ago.`),
          ],
          [
            say("You left "),
            lift(e.title),
            say(" on "),
            measure(`${done}/${own.length}`),
            say(" and haven't been back in "),
            measure(span(idle)),
            say("."),
          ],
        ],
        e.id,
      ),
      kicker: KICKER[type],
      context: contextOf(e.project_id, projects),
      target: { kind: "entry", id: e.id },
    });
  }

  return out;
}

// ── Channel: projects, seen against each other ────────────────────────────────

/**
 * The relational channel — the one that makes this a feed rather than a sorted
 * list. Three readings, all of which require seeing the WHOLE board at once:
 *
 *  • DISPLACED — this project went dark, and here is the one that ate the
 *    attention. Naming the thief is the whole point; "X is quiet" alone is a
 *    fact, "X is quiet because you've been in Y" is an observation.
 *  • HEAVY — one project is carrying more than everything else combined.
 *  • QUIET — nothing has moved here in a long time, and nothing displaced it.
 */
function projectDispatches(
  projects: DbProject[],
  entries: DbEntry[],
  now: number,
): Dispatch[] {
  const active = projects.filter((p) => p.status === "active");
  if (active.length === 0) return [];

  type Stat = {
    project: DbProject;
    open: number;
    idle: number | null;
    lastMove: number;
  };

  const stats: Stat[] = active.map((p) => {
    const own = entries.filter((e) => e.project_id === p.id);
    const open = own.filter((e) => !isDone(e)).length;
    const lastMove = Math.max(
      toMs(p.last_opened_at) ?? 0,
      toMs(p.updated_at) ?? 0,
      ...own.map(lastTouch),
      0,
    );
    return {
      project: p,
      open,
      idle: lastMove > 0 ? daysSince(lastMove, now) : null,
      lastMove,
    };
  });

  const withWork = stats.filter((s) => s.open > 0);
  if (withWork.length === 0) return [];

  // "Most of the board" must mean most of the BOARD — every open thing, filed
  // or not. Measuring a project only against other projects would let it claim
  // dominance while a pile of unfiled items sits alongside it.
  const totalOpen = entries.filter((e) => !isDone(e)).length;

  // The project you have most recently been inside — the candidate thief.
  const busiest = [...withWork].sort((a, b) => b.lastMove - a.lastMove)[0];

  const out: Dispatch[] = [];

  for (const s of withWork) {
    const { project: p, open, idle } = s;

    // HEAVY — carrying more than half the board's open work, on its own.
    if (withWork.length > 1 && open / totalOpen > HEAVY_SHARE && open >= 3) {
      out.push({
        id: `heavy-${p.id}`,
        channel: "board",
        source: "heavy",
        heat: "calm",
        weight: 340,
        segments: pick(
          [
            [
              lift(p.title),
              say(" is carrying "),
              measure(`${open} of ${totalOpen}`),
              say(" open things. It is most of the board."),
            ],
            [
              say("More than half of what's open — "),
              measure(`${open} of ${totalOpen}`),
              say(" — sits under "),
              lift(p.title),
              say("."),
            ],
          ],
          p.id,
        ),
        kicker: "PROJECT",
        context: `${open} open`,
        target: { kind: "project", id: p.id },
      });
      continue;
    }

    if (idle === null || idle < PROJECT_QUIET_DAYS) continue;

    // DISPLACED — it went quiet AND we can name what took its place.
    const displaced =
      busiest.project.id !== p.id &&
      busiest.idle !== null &&
      busiest.idle <= 2;

    if (displaced) {
      out.push({
        id: `displaced-${p.id}`,
        channel: "board",
        source: "displaced",
        heat: "calm",
        weight: 360 + Math.min(idle, 60),
        segments: pick(
          [
            [
              lift(p.title),
              say(" has "),
              measure(`${open} open`),
              say(` and hasn't moved in ${span(idle)} — you've been in ${busiest.project.title}.`),
            ],
            [
              say(`${busiest.project.title} has had all of it. `),
              lift(p.title),
              say(" has been still for "),
              measure(span(idle)),
              say("."),
            ],
          ],
          p.id,
        ),
        kicker: "DISPLACED",
        context: `by ${busiest.project.title}`,
        target: { kind: "project", id: p.id },
      });
      continue;
    }

    out.push({
      id: `quiet-${p.id}`,
      channel: "board",
      source: "quiet",
      heat: "calm",
      weight: 220 + Math.min(idle, 90),
      segments: pick(
        [
          [
            lift(p.title),
            say(" has been dark for "),
            measure(span(idle)),
            say(`, with ${open} still open.`),
          ],
          [
            measure(`${open} things`),
            say(" are waiting inside "),
            lift(p.title),
            say(`. Nothing has moved in ${span(idle)}.`),
          ],
        ],
        p.id,
      ),
      kicker: "PROJECT",
      context: `${span(idle)} quiet`,
      target: { kind: "project", id: p.id },
    });
  }

  return out;
}

// ── Channel: the board about itself ───────────────────────────────────────────

/**
 * SILENCE — nothing has closed in a long time. A fact about YOU, not about any
 * item, and the only line the board can say about its own metabolism. Held to a
 * flat observation: it reports the gap, it does not ask you to do better.
 */
function silenceDispatch(entries: DbEntry[], now: number): Dispatch[] {
  const closed = entries.filter(isDone);
  if (entries.length === 0) return [];

  const open = entries.filter((e) => !isDone(e)).length;
  if (open === 0) return [];

  const lastClose = closed.length
    ? Math.max(...closed.map((e) => toMs(e.updated_at) ?? 0))
    : 0;

  // Nothing has EVER closed — a different, quieter fact than "nothing lately".
  if (lastClose === 0) {
    if (open < 3) return [];
    return [
      {
        id: "silence-never",
        channel: "board",
        source: "silence",
        heat: "calm",
        weight: 260,
        segments: [
          measure(`${open} things`),
          say(" are open. Nothing has been closed yet."),
        ],
        kicker: "BOARD",
        context: "no closes",
        target: { kind: "board" },
      },
    ];
  }

  const quiet = daysSince(lastClose, now);
  if (quiet === null || quiet < SILENCE_DAYS) return [];

  return [
    {
      id: "silence",
      channel: "board",
      source: "silence",
      heat: "calm",
      weight: 280 + Math.min(quiet, 30),
      segments: pick(
        [
          [
            say("Nothing has closed in "),
            measure(span(quiet)),
            say(`. ${open} still open.`),
          ],
          [
            measure(span(quiet)),
            say(" since the last thing came off the board."),
          ],
        ],
        `silence-${quiet}`,
      ),
      kicker: "BOARD",
      context: "silence",
      target: { kind: "board" },
    },
  ];
}

/**
 * ORPHANS — things belonging to nothing. Not a failing (PRODUCT.md: nothing is
 * forced into a project); just a shape the board has taken that is invisible
 * from any single row.
 */
function orphanDispatch(entries: DbEntry[], projects: DbProject[]): Dispatch[] {
  if (projects.filter((p) => p.status === "active").length === 0) return [];

  const orphans = entries.filter((e) => !isDone(e) && !e.project_id);
  if (orphans.length < ORPHAN_MIN) return [];

  return [
    {
      id: "orphans",
      channel: "board",
      source: "orphans",
      heat: "calm",
      weight: 180,
      segments: [
        measure(`${orphans.length} things`),
        say(" belong to no project. They're only held here."),
      ],
      kicker: "BOARD",
      context: "unfiled",
      target: { kind: "board" },
    },
  ];
}

// ── Channel: the diary, read as behaviour ─────────────────────────────────────

/**
 * Notes, in two readings:
 *
 *  • ECHO / FRESH — the trace of what you were on, hours ago.
 *  • PATTERN — you keep writing about a thing and not moving it. This is the
 *    sharpest line the board can produce, and it comes straight from the mock's
 *    "you wrote about the collective instead of the site". It is an observation
 *    about attention, not a reprimand — it states the count and stops.
 */
function noteDispatches(
  notes: DbDiaryEntry[],
  entries: DbEntry[],
  projects: DbProject[],
  now: number,
): Dispatch[] {
  const out: Dispatch[] = [];

  const nameOf = (n: DbDiaryEntry): string | null => {
    const e = n.linked_entry_id
      ? entries.find((x) => x.id === n.linked_entry_id)
      : undefined;
    const p = n.linked_project_id
      ? projects.find((x) => x.id === n.linked_project_id)
      : undefined;
    return e?.title ?? p?.title ?? null;
  };

  // PATTERN — the same subject written about repeatedly, inside a week, while
  // the subject itself hasn't budged.
  const weekAgo = now - 7 * DAY_MS;
  const bySubject = new Map<string, { name: string; n: number; note: DbDiaryEntry }>();

  for (const n of notes) {
    const ms = toMs(n.created_at);
    if (ms === null || ms < weekAgo) continue;
    const key = n.linked_entry_id ?? n.linked_project_id;
    if (!key) continue;
    const name = nameOf(n);
    if (!name) continue;
    const prev = bySubject.get(key);
    bySubject.set(key, { name, n: (prev?.n ?? 0) + 1, note: prev?.note ?? n });
  }

  for (const [key, { name, n, note }] of bySubject) {
    if (n < 3) continue;

    // Did the subject actually move while you were writing about it?
    const subject = entries.find((e) => e.id === key);
    const moved =
      subject !== undefined &&
      (toMs(subject.updated_at) ?? 0) > weekAgo &&
      !isDone(subject);

    out.push({
      id: `pattern-${key}`,
      channel: "note",
      source: "note-pattern",
      heat: "calm",
      weight: 440,
      segments: moved
        ? [
            say("You've written about "),
            lift(name),
            say(" "),
            measure(`${n} times`),
            say(" this week, and you have been working on it."),
          ]
        : [
            say("You've written about "),
            lift(name),
            say(" "),
            measure(`${n} times`),
            say(" this week and moved nothing on it."),
          ],
      kicker: "PATTERN",
      context: `${n} notes`,
      target: { kind: "note", id: note.id },
    });
  }

  // FRESH — a recent trace, still warm.
  for (const n of notes) {
    const hrs = hoursSince(n.created_at, now);
    if (hrs === null || hrs > NOTE_FRESH_HOURS) continue;

    const key = n.linked_entry_id ?? n.linked_project_id;
    if (key && bySubject.get(key)?.n && bySubject.get(key)!.n >= 3) continue; // the pattern line already said it

    const at = dayjs(toMs(n.created_at)!);
    const when = at.isSame(dayjs(now), "day")
      ? at.format("HH:mm")
      : `last night at ${at.format("HH:mm")}`;
    const name = nameOf(n);

    out.push({
      id: `note-${n.id}`,
      channel: "note",
      source: "note-fresh",
      heat: "calm",
      weight: 480 - hrs,
      segments: name
        ? [say("You wrote about "), lift(name), say(`, ${when}.`)]
        : [say("You put something down at "), measure(when), say(".")],
      kicker: "NOTE",
      context: name ? "linked" : CONTEXT_FREE,
      target: { kind: "note", id: n.id },
    });
  }

  return out;
}

/**
 * ECHO — captured minutes ago and still unclassified into a project. The board
 * confirming it caught the thing, which is the reassurance an ADHD user needs
 * more than any nudge.
 */
function echoDispatches(entries: DbEntry[], now: number): Dispatch[] {
  const out: Dispatch[] = [];

  for (const e of entries) {
    if (isDone(e) || e.project_id) continue;

    const hrs = hoursSince(e.created_at, now);
    if (hrs === null || hrs > ECHO_HOURS) continue;

    const type = e.type as EntryType;
    out.push({
      id: `echo-${e.id}`,
      channel: type as DispatchChannel,
      source: "echo",
      heat: "calm",
      weight: 520 - hrs,
      segments: [
        lift(e.title),
        say(" came in "),
        measure(hrs === 0 ? "just now" : `${hrs}h ago`),
        say(", still unfiled."),
      ],
      kicker: KICKER[type],
      context: "just caught",
      target: { kind: "entry", id: e.id },
    });
  }

  return out;
}

// ── Ranking, collapsing, de-stacking ──────────────────────────────────────────

/**
 * When the collision line is speaking, the individual dated rows it describes
 * become redundant — five "X is due" lines underneath "five things land in the
 * next seven days" is the board stuttering, and it is exactly the wall of
 * near-identical rows this file exists to prevent.
 *
 * So the summary ABSORBS what it covers: every calm dated line inside the
 * window goes quiet. The HOT ones never do — an overdue item, or something due
 * today, is not a statistic and is never spoken for by a summary.
 */
function collapse(pool: Dispatch[]): Dispatch[] {
  if (!pool.some((d) => d.source === "collision")) return pool;
  const absorbed: DispatchSource[] = ["due", "horizon"];
  return pool.filter(
    (d) => !(absorbed.includes(d.source) && d.heat === "calm"),
  );
}

/**
 * De-stack: never more than MAX_RUN lines in a row from the same generator.
 * A dispatch that would break the run is deferred, not dropped — it comes back
 * as soon as another voice has spoken. This is what stops the feed from reading
 * as four identical rows even when the board genuinely has four due items.
 */
function destack(ranked: Dispatch[]): Dispatch[] {
  // One queue, still in weight order. Each step takes the HIGHEST-weighted line
  // that is legal right now — which is simply the first one in the queue whose
  // source wouldn't extend the current run past MAX_RUN. Nothing is dropped and
  // nothing is reordered beyond the minimum needed to break a run, so a
  // deferred line comes straight back as soon as another voice has spoken.
  const queue = [...ranked];
  const feed: Dispatch[] = [];
  let lastSource: DispatchSource | null = null;
  let run = 0;

  while (queue.length > 0) {
    let idx = queue.findIndex(
      (d) => !(d.source === lastSource && run >= MAX_RUN),
    );

    // Everything left is the same maxed-out source. Dropping it would hide real
    // board items, so let the run continue rather than lose a line.
    if (idx === -1) idx = 0;

    const next = queue.splice(idx, 1)[0];
    run = next.source === lastSource ? run + 1 : 1;
    lastSource = next.source;
    feed.push(next);
  }

  return feed;
}

/**
 * Read the whole board and speak it. Every channel runs, the pool is ranked by
 * weight, collapsed against its summaries, de-duped per subject, de-stacked so
 * no voice repeats itself, and cut at MAX_DISPATCHES.
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
    ...clockDispatches(entries, projects),
    ...collisionDispatches(entries),
    ...echoDispatches(entries, now),
    ...noteDispatches(notes, entries, projects, now),
    ...frozenDispatches(entries, tasks, projects, now),
    ...projectDispatches(projects, entries, now),
    ...ideaDispatches(entries, projects, now),
    ...silenceDispatch(entries, now),
    ...orphanDispatch(entries, projects),
  ];

  const ranked = collapse(pool).sort((a, b) => b.weight - a.weight);

  // One line per subject — the loudest reading of a thing is the only reading.
  // Board-level lines are exempt: they each speak about a different pattern.
  const spoken = new Set<string>();
  const unique: Dispatch[] = [];

  for (const d of ranked) {
    if (d.target.kind !== "board") {
      const subject = `${d.target.kind}:${d.target.id}`;
      if (spoken.has(subject)) continue;
      spoken.add(subject);
    }
    unique.push(d);
  }

  return destack(unique).slice(0, MAX_DISPATCHES);
}
