import dayjs from "dayjs";

import {
  clearAllData,
  generateId,
  seedDefaultProjectsOnce,
} from "@/lib/database";
import { serializeRule } from "@/lib/recurrence";

import type { RecurrenceFrequency } from "@/lib/types";
import type * as SQLite from "expo-sqlite";

/**
 * DEV-ONLY mock data. The pivot introduced a projects hierarchy with a
 * pressure-driven Workshop list (HOT / NOW LINE / STEADY / ARCHIVED) and an
 * Atlas canvas with four quadrants. A single seed can no longer prove every
 * surface — devs would otherwise have to hand-craft data to see, e.g., the
 * "NOTHING PRESSING" copy or the "AND THAT'S ALL" copy.
 *
 * So the seed is a *registry of scenarios*. Each scenario wipes the DB, then
 * inserts a deterministic fixture that lands the projects page (and connected
 * surfaces) in exactly one state. The dev menu exposes them as a picker.
 *
 * Auto-seed-on-empty still runs the canonical "mixed-pressure" scenario so the
 * first launch experience matches what the home/diary copy was written for.
 */

const fmt = (d: dayjs.Dayjs) => d.format("DD/MM/YYYY");
const today = dayjs().startOf("day");
const d = (offset: number) => fmt(today.add(offset, "day"));

const endOfWeek = () => fmt(today.endOf("week"));
const endOfMonth = () => fmt(today.endOf("month"));
const endOfYear = () => fmt(today.endOf("year"));

// ─── Fixture types ────────────────────────────────────────────────────────────

type ProjectSeed = {
  key: string;
  title: string;
  status?: "active" | "archived";
  emoji?: string;
};

type TaskSeed = {
  title: string;
  done?: boolean;
};

type EntrySeed = {
  title: string;
  type: "todo" | "deadline" | "idea";
  subtitle?: string;
  inspiration?: string;
  notes?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  due_date?: string;
  due_time?: string;
  due_range?: "week" | "month" | "year";
  status?: string;
  recurrenceFreq?: RecurrenceFrequency;
  recurrenceDays?: number[];
  recurrenceEndDate?: string;
  project?: string;
  promoted?: string;
  touchedDaysAgo?: number;
  createdDaysAgo?: number;
  /** Todo/deadline only — an idea with tasks is a project (see lib/types.ts). */
  tasks?: TaskSeed[];
};

type DiarySeed = {
  body: string;
  mood?: "calm" | "low" | "charged" | "tired" | "bright";
  project?: string;
  createdDaysAgo: number;
};

type Fixture = {
  projects: ProjectSeed[];
  entries: EntrySeed[];
  diary: DiarySeed[];
};

export type ScenarioKey =
  | "empty"
  | "default-projects"
  | "mixed-pressure"
  | "nothing-pressing"
  | "all-hot"
  | "archived-heavy"
  | "freshness-ladder"
  | "empty-project-starters"
  | "detail-sheet-showcase";

export type Scenario = {
  key: ScenarioKey;
  /** Short label for the dev menu button. */
  label: string;
  /** One-line description of the UI state this scenario produces. */
  description: string;
  fixture: Fixture;
};

// ─── Scenarios ────────────────────────────────────────────────────────────────

/**
 * The canonical seed: a busy world that exercises every type at every urgency.
 * Lands the Workshop in "BELOW THE LINE · QUIET FOR NOW" with both HOT and
 * STEADY bands populated. Matches what the narrative copy was written for.
 */
const MIXED_PRESSURE: Fixture = {
  projects: [
    { key: "studio", title: "Studio rebrand", emoji: "🪩" },
    { key: "collective", title: "Art collective", emoji: "🎭" },
    { key: "synapse", title: "Synapse app", emoji: "🧠" },
  ],
  entries: [
    // Bills & precise deadlines — overdue → distant.
    {
      title: "Electricity bill",
      type: "deadline",
      due_date: d(-2),
      status: "overdue",
      createdDaysAgo: 12,
    },
    { title: "Rent", type: "deadline", due_date: d(1), due_time: "09:00 AM" },
    { title: "Phone bill", type: "deadline", due_date: d(4) },
    { title: "Car insurance renewal", type: "deadline", due_date: d(23) },
    { title: "Passport expires", type: "deadline", due_date: d(180) },

    // Horizon deadlines — at least one inside a project so the Workshop has a HOT row.
    {
      title: "Book the dentist",
      type: "deadline",
      due_range: "week",
      due_date: endOfWeek(),
      createdDaysAgo: 10,
      project: "studio",
    },
    {
      title: "File the quarterly taxes",
      type: "deadline",
      due_range: "month",
      due_date: endOfMonth(),
      project: "studio",
    },
    {
      title: "Renew the studio lease",
      type: "deadline",
      due_range: "year",
      due_date: endOfYear(),
      project: "studio",
    },

    // Ideas — staggered freshness; one already promoted.
    {
      title: "Newsletter about small tools",
      type: "idea",
      subtitle: "weekly, short",
      touchedDaysAgo: 0,
      createdDaysAgo: 0,
    },
    {
      title: "An app that names your plants",
      type: "idea",
      touchedDaysAgo: 1,
      createdDaysAgo: 1,
    },
    {
      title: "Tiny zine on city benches",
      type: "idea",
      touchedDaysAgo: 2,
      createdDaysAgo: 2,
      project: "collective",
    },
    {
      title: "A font made from my handwriting",
      type: "idea",
      touchedDaysAgo: 9,
      createdDaysAgo: 11,
    },
    {
      title: "Map every good espresso in town",
      type: "idea",
      touchedDaysAgo: 13,
      createdDaysAgo: 16,
    },
    {
      title: "A shared sketch wall",
      type: "idea",
      touchedDaysAgo: 20,
      createdDaysAgo: 40,
      promoted: "collective",
    },

    // To-dos — today → next week. One overdue todo inside `synapse` makes it HOT via the todo lane.
    { title: "Reply to Marco", type: "todo", scheduled_date: d(0) },
    {
      title: "Export the new logo set",
      type: "todo",
      scheduled_date: d(0),
      project: "studio",
    },
    { title: "Pick up dry cleaning", type: "todo", scheduled_date: d(3) },
    {
      title: "Draft the migration plan",
      type: "todo",
      scheduled_date: d(-1),
      project: "synapse",
    },
    { title: "Water the plants", type: "todo", scheduled_date: d(5) },
    { title: "Deep-clean the kitchen", type: "todo", scheduled_date: d(12) },

    // Recently cleared.
    {
      title: "Send the invoices",
      type: "todo",
      scheduled_date: d(-1),
      status: "completed",
      touchedDaysAgo: 1,
      project: "studio",
    },
    {
      title: "Pay the water bill",
      type: "deadline",
      due_date: d(-3),
      status: "met",
      touchedDaysAgo: 2,
    },

    // Someday todos.
    { title: "Visit the Dolomites", type: "todo", touchedDaysAgo: 2 },
    { title: "Read the Neapolitan novels", type: "todo", touchedDaysAgo: 9 },
    { title: "Take a pottery class", type: "todo", touchedDaysAgo: 20 },
  ],
  diary: [
    {
      body: "Spent the evening sketching the new mark — something between a node and a leaf finally clicked.",
      mood: "bright",
      project: "studio",
      createdDaysAgo: 1,
    },
    {
      body: "Quiet day. Read on the balcony and let the to-do list wait.",
      mood: "calm",
      createdDaysAgo: 3,
    },
  ],
};

/**
 * Empty world. Projects page renders its empty-state copy:
 *   "Nothing in the inventory yet. Name one above, or promote an idea…"
 * Atlas hides; Workshop hides.
 */
const EMPTY: Fixture = { projects: [], entries: [], diary: [] };

/**
 * Several active projects, none pressing. NOW LINE renders as
 * "NOTHING PRESSING" and the steady band is fully populated.
 */
const NOTHING_PRESSING: Fixture = {
  projects: [
    { key: "studio", title: "Studio rebrand", emoji: "🪩" },
    { key: "collective", title: "Art collective", emoji: "🎭" },
    { key: "synapse", title: "Synapse app", emoji: "🧠" },
    { key: "garden", title: "Balcony garden", emoji: "🪴" },
  ],
  // All work is comfortably outside the 7-day window and no overdue todos.
  entries: [
    {
      title: "Move the logo set into Figma",
      type: "todo",
      scheduled_date: d(14),
      project: "studio",
      touchedDaysAgo: 1,
    },
    {
      title: "Pick a venue for the show",
      type: "deadline",
      due_date: d(40),
      project: "collective",
      touchedDaysAgo: 3,
    },
    {
      title: "Migrate to schema v10",
      type: "todo",
      scheduled_date: d(21),
      project: "synapse",
      touchedDaysAgo: 0,
    },
    {
      title: "Repot the basil",
      type: "todo",
      scheduled_date: d(10),
      project: "garden",
      touchedDaysAgo: 14,
    },
  ],
  diary: [],
};

/**
 * Only pressing projects, no steady ones. NOW LINE renders as
 * "AND THAT'S ALL". Three HOT rows with mixed sources (deadline / overdue
 * todo) so both row tints appear.
 */
const ALL_HOT: Fixture = {
  projects: [
    { key: "studio", title: "Studio rebrand", emoji: "🪩" },
    { key: "collective", title: "Art collective", emoji: "🎭" },
    { key: "synapse", title: "Synapse app", emoji: "🧠" },
  ],
  entries: [
    // studio — overdue deadline (deadline tint, top of HOT band)
    {
      title: "Send the new logo to print",
      type: "deadline",
      due_date: d(-3),
      status: "overdue",
      project: "studio",
      createdDaysAgo: 10,
    },
    // collective — deadline tomorrow (deadline tint)
    {
      title: "Submit the show proposal",
      type: "deadline",
      due_date: d(1),
      project: "collective",
      createdDaysAgo: 6,
    },
    // synapse — only an overdue todo (todo tint, cyan)
    {
      title: "Draft the migration plan",
      type: "todo",
      scheduled_date: d(-2),
      project: "synapse",
      touchedDaysAgo: 0,
    },
  ],
  diary: [],
};

/**
 * Many archived projects + a couple of active ones. Exercises the ARCHIVED
 * section ("ARCHIVED · 5") at the bottom of the Workshop list.
 */
const ARCHIVED_HEAVY: Fixture = {
  projects: [
    { key: "studio", title: "Studio rebrand", emoji: "🪩" },
    { key: "synapse", title: "Synapse app", emoji: "🧠" },
    {
      key: "old-zine",
      title: "City benches zine",
      emoji: "📖",
      status: "archived",
    },
    {
      key: "old-fest",
      title: "Summer festival run",
      emoji: "🎪",
      status: "archived",
    },
    {
      key: "old-pod",
      title: "Two-person podcast",
      emoji: "🎙️",
      status: "archived",
    },
    {
      key: "old-shop",
      title: "Etsy shop experiment",
      emoji: "🛍️",
      status: "archived",
    },
    {
      key: "old-newsletter",
      title: "Daily letters",
      emoji: "✉️",
      status: "archived",
    },
  ],
  entries: [
    {
      title: "Move the logo set into Figma",
      type: "todo",
      scheduled_date: d(14),
      project: "studio",
      touchedDaysAgo: 1,
    },
    {
      title: "Migrate to schema v10",
      type: "todo",
      scheduled_date: d(21),
      project: "synapse",
      touchedDaysAgo: 0,
    },
  ],
  diary: [],
};

/**
 * One project at each rung of the freshness ladder so every STEADY passage
 * label (NEW / TODAY / 3D / 2W / QUIET 3M) shows up at once.
 *
 * The passage label is computed from the freshest entry timestamp on the
 * project — so we plant a single entry per project, dated to the right rung,
 * and keep all work outside the 7-day HOT window.
 */
const FRESHNESS_LADDER: Fixture = {
  projects: [
    { key: "fresh-new", title: "Fresh start", emoji: "🌱" },
    { key: "fresh-today", title: "Today's work", emoji: "☀️" },
    { key: "fresh-3d", title: "Mid-week project", emoji: "🌤️" },
    { key: "fresh-2w", title: "Last fortnight's thing", emoji: "🌗" },
    { key: "fresh-quiet", title: "Old quiet project", emoji: "🌙" },
  ],
  entries: [
    // fresh-new: no entries → passage label = "NEW"
    // fresh-today: scheduled comfortably in the future, touched today
    {
      title: "Outline the kickoff",
      type: "todo",
      scheduled_date: d(30),
      project: "fresh-today",
      touchedDaysAgo: 0,
    },
    // fresh-3d: touched 3 days ago
    {
      title: "Iterate on the sketches",
      type: "todo",
      scheduled_date: d(40),
      project: "fresh-3d",
      touchedDaysAgo: 3,
    },
    // fresh-2w: touched 14 days ago
    {
      title: "Reach out to the printer",
      type: "todo",
      scheduled_date: d(60),
      project: "fresh-2w",
      touchedDaysAgo: 14,
    },
    // fresh-quiet: touched 95 days ago → "QUIET 3M"
    {
      title: "Initial research",
      type: "todo",
      scheduled_date: d(120),
      project: "fresh-quiet",
      touchedDaysAgo: 95,
      createdDaysAgo: 95,
    },
  ],
  diary: [],
};

/**
 * Empty-project starter states. Three empty projects, no filed content, so each
 * shows the ProjectStarters rows (the useful default):
 *   - "Body" is a seeded DEFAULT title → tailored starters ("Book a workout")
 *     with prefill; tapping opens the composer pre-filled.
 *   - "Money" is a second seeded default → different tailored starters, proving
 *     the copy is per-project.
 *   - "Weekend cabin" is a USER-created title → generic starters ("First
 *     project todo") that open the composer blank.
 * Titles must match DEFAULT_PROJECT_STARTERS keys in lib/project-starters.ts for
 * the tailored path to fire.
 */
const EMPTY_PROJECT_STARTERS: Fixture = {
  projects: [
    { key: "body", title: "Body", emoji: "🌿" },
    { key: "money", title: "Money", emoji: "💰" },
    { key: "cabin", title: "Weekend cabin", emoji: "🏕️" },
  ],
  entries: [],
  diary: [],
};

/**
 * One project ("Detail sheet lab") holding an entry per DirectDetailSheet
 * branch: urgency states, done states, horizon vs. precise deadlines, every
 * recurrence frequency, inspiration/notes/subtitle text blocks, subtasks in
 * mixed completion, and idea-narrative aging. Plus one deliberately unfiled
 * todo (open from Home, not the project screen) so the no-breadcrumb path
 * shows too.
 *
 * Ideas are NOT tappable into the sheet from the project screen (it only
 * routes todo/deadline rows there — see components/organisms/direct-row use
 * in app/(tabs)/(projects)/project.tsx) but ARE tappable from the home board's
 * direct zone (components/organisms/direct-overview.tsx). Open the ideas in
 * this scenario from Home, not from the "Detail sheet lab" project page.
 */
const DETAIL_SHEET_SHOWCASE: Fixture = {
  projects: [
    { key: "lab", title: "Detail sheet lab", emoji: "🔬" },
    { key: "quiet", title: "No emoji project" },
  ],
  entries: [
    // ── Todo: baseline, precise date+time today, charged ──
    {
      title: "Reply to Marco",
      type: "todo",
      scheduled_date: d(0),
      scheduled_time: "5:00 PM",
      project: "lab",
    },

    // ── Todo: overdue, danger urgency chip + charged red WHEN ──
    {
      title: "Send the invoice",
      type: "todo",
      scheduled_date: d(-4),
      status: "overdue",
      project: "lab",
      createdDaysAgo: 10,
    },

    // ── Todo: distant, not charged, muted WHEN (day 8, just past the <7 threshold) ──
    {
      title: "Deep-clean the studio",
      type: "todo",
      scheduled_date: d(8),
      project: "lab",
    },

    // ── Todo: completed — strikethrough title, no complete pill, "Settled" narrative ──
    {
      title: "Pay the electricity bill",
      type: "todo",
      scheduled_date: d(-2),
      status: "completed",
      touchedDaysAgo: 1,
      project: "lab",
    },

    // ── Todo: recurring weekly on Mon/Wed/Fri, with an end date ──
    {
      title: "Water the plants",
      type: "todo",
      scheduled_date: d(1),
      project: "lab",
      recurrenceFreq: "weekly",
      recurrenceDays: [1, 3, 5],
      recurrenceEndDate: endOfYear(),
    },

    // ── Todo: recurring daily, no end date ──
    {
      title: "Morning pages",
      type: "todo",
      scheduled_date: d(0),
      project: "lab",
      recurrenceFreq: "daily",
    },

    // ── Todo: recurring weekdays ──
    {
      title: "Stand-up notes",
      type: "todo",
      scheduled_date: d(0),
      project: "lab",
      recurrenceFreq: "weekdays",
    },

    // ── Todo: recurring monthly ──
    {
      title: "Review the budget",
      type: "todo",
      scheduled_date: d(0),
      project: "lab",
      recurrenceFreq: "monthly",
    },

    // ── Todo: subtasks, mixed done/open, plus a subtitle ──
    {
      title: "Ship the release",
      type: "todo",
      subtitle: "v2.4 — widget sync fix",
      scheduled_date: d(2),
      project: "lab",
      tasks: [
        { title: "Bump version number", done: true },
        { title: "Write changelog", done: true },
        { title: "Submit to TestFlight", done: false },
        { title: "Smoke-test the widget", done: false },
      ],
    },

    // ── Todo: unfiled (no project) — no breadcrumb in the sheet ──
    { title: "Buy stamps", type: "todo", scheduled_date: d(3) },

    // ── Deadline: precise date, distant, muted ──
    {
      title: "Car insurance renewal",
      type: "deadline",
      due_date: d(30),
      project: "lab",
    },

    // ── Deadline: horizon window (this week) — horizonReadout instead of a date ──
    {
      title: "Book the dentist",
      type: "deadline",
      due_range: "week",
      due_date: endOfWeek(),
      project: "lab",
      createdDaysAgo: 5,
    },

    // ── Deadline: horizon window (this month) ──
    {
      title: "File the quarterly taxes",
      type: "deadline",
      due_range: "month",
      due_date: endOfMonth(),
      project: "lab",
    },

    // ── Deadline: horizon window (this year) ──
    {
      title: "Renew the studio lease",
      type: "deadline",
      due_range: "year",
      due_date: endOfYear(),
      project: "lab",
    },

    // ── Deadline: met — "Mark met" done-label variant, strikethrough ──
    {
      title: "Pay the water bill",
      type: "deadline",
      due_date: d(-5),
      status: "met",
      touchedDaysAgo: 2,
      project: "lab",
    },

    // ── Deadline: overdue, danger chip ──
    {
      title: "Passport renewal paperwork",
      type: "deadline",
      due_date: d(-1),
      status: "overdue",
      project: "lab",
      createdDaysAgo: 20,
    },

    // ── Deadline: subtasks + notes block ──
    {
      title: "Studio lease renewal",
      type: "deadline",
      due_date: d(14),
      notes:
        "Landlord wants the deposit wired by the 1st. Ask about the parking spot clause before signing.",
      project: "lab",
      tasks: [
        { title: "Review redlines", done: true },
        { title: "Sign and scan", done: false },
      ],
    },

    // ── Idea: fresh (today), open from Home — no "Sketched…" narrative yet ──
    {
      title: "Newsletter about small tools",
      type: "idea",
      subtitle: "weekly, short",
      touchedDaysAgo: 0,
      createdDaysAgo: 0,
      project: "lab",
    },

    // ── Idea: old (>7 days) — "Sketched Nd ago" narrative ──
    {
      title: "A font made from my handwriting",
      type: "idea",
      touchedDaysAgo: 12,
      createdDaysAgo: 18,
      project: "lab",
    },

    // ── Idea: inspiration block ──
    {
      title: "Tiny zine on city benches",
      type: "idea",
      inspiration:
        "Saw someone reading alone on a bench in the rain and thought: every bench has a story if you sit long enough.",
      touchedDaysAgo: 3,
      createdDaysAgo: 3,
      project: "lab",
    },

    // ── Idea: notes block (distinct from inspiration) ──
    {
      title: "Map every good espresso in town",
      type: "idea",
      notes:
        "Start with the three places near the studio. Rate on a 1-5 scale: crema, temperature, seating.",
      touchedDaysAgo: 6,
      createdDaysAgo: 9,
      project: "lab",
    },

    // ── Idea: filed in the no-emoji project — breadcrumb with plain folder glyph ──
    {
      title: "A shared sketch wall",
      type: "idea",
      touchedDaysAgo: 4,
      createdDaysAgo: 4,
      project: "quiet",
    },
  ],
  diary: [],
};

const SCENARIOS_BY_KEY: Record<ScenarioKey, Scenario> = {
  empty: {
    key: "empty",
    label: "Empty",
    description:
      'No projects at all. Home shows the first-run "Name a project" tile.',
    fixture: EMPTY,
  },
  "default-projects": {
    key: "default-projects",
    label: "Default projects",
    description:
      "Genuine first-run state: the six seeded macro-areas, featured and empty, each showing its narrative line.",
    // Seeded via seedDefaultProjectsOnce (not a fixture) so this mirrors the
    // real production first launch exactly. Fixture is empty; seedScenario
    // routes this key through the real default-seeding path.
    fixture: EMPTY,
  },
  "mixed-pressure": {
    key: "mixed-pressure",
    label: "Mixed pressure",
    description:
      'HOT + STEADY bands both populated. NOW LINE: "BELOW THE LINE · QUIET FOR NOW".',
    fixture: MIXED_PRESSURE,
  },
  "nothing-pressing": {
    key: "nothing-pressing",
    label: "Nothing pressing",
    description: 'All projects calm. NOW LINE: "NOTHING PRESSING".',
    fixture: NOTHING_PRESSING,
  },
  "all-hot": {
    key: "all-hot",
    label: "All hot",
    description:
      'Every project pressing, none steady. NOW LINE: "AND THAT\'S ALL".',
    fixture: ALL_HOT,
  },
  "archived-heavy": {
    key: "archived-heavy",
    label: "Archived heavy",
    description:
      "Five archived projects + two active. Exercises the ARCHIVED band.",
    fixture: ARCHIVED_HEAVY,
  },
  "freshness-ladder": {
    key: "freshness-ladder",
    label: "Freshness ladder",
    description:
      "One STEADY project at each passage rung: NEW / TODAY / 3D / 2W / QUIET 3M.",
    fixture: FRESHNESS_LADDER,
  },
  "empty-project-starters": {
    key: "empty-project-starters",
    label: "Empty project · starters",
    description:
      "Empty Body / Money (tailored starters) + a user-named project (generic starters). Open each to see the starter rows.",
    fixture: EMPTY_PROJECT_STARTERS,
  },
  "detail-sheet-showcase": {
    key: "detail-sheet-showcase",
    label: "Detail sheet showcase",
    description:
      "One entry per DirectDetailSheet state: urgency, done, horizons, every recurrence, subtasks, inspiration/notes, unfiled. Ideas open from Home, not the project page.",
    fixture: DETAIL_SHEET_SHOWCASE,
  },
};

/** Ordered list for the dev-menu picker. */
export const SCENARIOS: Scenario[] = [
  SCENARIOS_BY_KEY["default-projects"],
  SCENARIOS_BY_KEY["mixed-pressure"],
  SCENARIOS_BY_KEY["nothing-pressing"],
  SCENARIOS_BY_KEY["all-hot"],
  SCENARIOS_BY_KEY["archived-heavy"],
  SCENARIOS_BY_KEY["freshness-ladder"],
  SCENARIOS_BY_KEY["empty-project-starters"],
  SCENARIOS_BY_KEY["detail-sheet-showcase"],
  SCENARIOS_BY_KEY.empty,
];

// ─── Insert ───────────────────────────────────────────────────────────────────

async function insertFixture(
  db: SQLite.SQLiteDatabase,
  fixture: Fixture,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const DAY_SECS = 86_400;

  const projectId: Record<string, string> = {};
  for (const p of fixture.projects) {
    const id = generateId();
    projectId[p.key] = id;
    await db.runAsync(
      `INSERT INTO projects (id, title, status, emoji, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      p.title,
      p.status ?? "active",
      p.emoji ?? null,
      now,
      now,
    );
  }

  for (const s of fixture.entries) {
    const touched = now - (s.touchedDaysAgo ?? 0) * DAY_SECS;
    const created =
      now - (s.createdDaysAgo ?? s.touchedDaysAgo ?? 0) * DAY_SECS;
    const entryId = generateId();
    const recurrenceRule = s.recurrenceFreq
      ? serializeRule({ freq: s.recurrenceFreq, days: s.recurrenceDays })
      : null;
    await db.runAsync(
      `INSERT INTO entries
       (id, title, type, subtitle, inspiration, scheduled_date, scheduled_time, due_date, due_time, notes, status, recurrence_rule, recurrence_end_date, project_id, due_range, promoted_project_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      entryId,
      s.title,
      s.type,
      s.subtitle ?? null,
      s.inspiration ?? null,
      s.scheduled_date ?? null,
      s.scheduled_time ?? null,
      s.due_date ?? null,
      s.due_time ?? null,
      s.notes ?? null,
      s.status ?? (s.type === "deadline" ? "pending" : "scheduled"),
      recurrenceRule,
      s.recurrenceEndDate ?? null,
      s.project ? (projectId[s.project] ?? null) : null,
      s.due_range ?? null,
      s.promoted ? (projectId[s.promoted] ?? null) : null,
      created,
      touched,
    );

    for (const [i, t] of (s.tasks ?? []).entries()) {
      await db.runAsync(
        `INSERT INTO tasks (id, entry_id, title, done, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        generateId(),
        entryId,
        t.title,
        t.done ? 1 : 0,
        i,
        created,
        touched,
      );
    }
  }

  for (const n of fixture.diary) {
    const created = now - n.createdDaysAgo * DAY_SECS;
    await db.runAsync(
      `INSERT INTO diary_entries
       (id, body, mood, linked_entry_id, linked_project_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      generateId(),
      n.body,
      n.mood ?? null,
      null,
      n.project ? (projectId[n.project] ?? null) : null,
      created,
      created,
    );
  }
}

/**
 * Auto-seed: runs at app launch if the entries table is empty. Uses the
 * canonical "mixed-pressure" fixture so the home/diary narrative copy reads
 * as designed on first run.
 */
export async function seedDevDataIfEmpty(
  db: SQLite.SQLiteDatabase,
): Promise<boolean> {
  if (!__DEV__) return false;

  const row = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) as n FROM entries",
  );
  if ((row?.n ?? 0) > 0) return false;

  const fixture = SCENARIOS_BY_KEY["mixed-pressure"].fixture;
  await insertFixture(db, fixture);
  // Claim the default-seed flag so seedDefaultProjectsOnce (which runs right
  // after this in the provider init) doesn't stack the six defaults on top of
  // the dev fixture. Devs who want the defaults pick the "Default projects"
  // scenario explicitly.
  await db.runAsync(
    "INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('did_seed_default_projects', '1')",
  );
  console.log(
    `[dev-seed] auto-seeded "mixed-pressure": ${fixture.projects.length} projects, ${fixture.entries.length} entries, ${fixture.diary.length} diary notes`,
  );
  return true;
}

/**
 * Manual seed: wipes the database, then inserts the named scenario.
 * Triggered from the dev menu. Never runs outside __DEV__.
 *
 * Default-project handling: `clearAllData` drops the `did_seed_default_projects`
 * flag (so a real clear returns to first-run). That would let the next launch's
 * auto-seed inject the six defaults on top of whatever scenario we pick. So:
 *   - "default-projects": route through the real seed path so the scenario IS
 *     the production first-run (featured, empty, narrative lines showing).
 *   - every other scenario: seed the curated fixture, then re-set the flag so
 *     the auto-seed stays out and the scenario reads exactly as authored.
 */
export async function seedScenario(
  db: SQLite.SQLiteDatabase,
  key: ScenarioKey,
): Promise<void> {
  const scenario = SCENARIOS_BY_KEY[key];
  if (!scenario) throw new Error(`Unknown seed scenario: ${key}`);

  await clearAllData();

  if (key === "default-projects") {
    await seedDefaultProjectsOnce();
    console.log('[dev-seed] applied "Default projects": 6 seeded macro-areas');
    return;
  }

  await insertFixture(db, scenario.fixture);
  // Keep the auto-seed from stacking defaults onto this curated scenario.
  await db.runAsync(
    "INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('did_seed_default_projects', '1')",
  );
  console.log(
    `[dev-seed] applied "${scenario.label}": ${scenario.fixture.projects.length} projects, ${scenario.fixture.entries.length} entries, ${scenario.fixture.diary.length} diary notes`,
  );
}
