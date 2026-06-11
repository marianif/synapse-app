import dayjs from "dayjs";

import { generateId } from "@/lib/database";

import type * as SQLite from "expo-sqlite";

/**
 * DEV-ONLY mock data. Seeds the full schema-v9 world so the narrative home has
 * real material to read back: a spread of entries across all five types and all
 * three urgency tiers, deadline horizons (week/month/year windows), a couple of
 * projects with entries filed under them, an idea already promoted to a project
 * (provenance), and a yesterday diary trace. Runs once, only when the entries
 * table is empty, only under __DEV__. Never ships to production.
 */

const fmt = (d: dayjs.Dayjs) => d.format("DD/MM/YYYY");
const today = dayjs().startOf("day");
const d = (offset: number) => fmt(today.add(offset, "day"));

/** End-of-window date for a horizon, so due_date stays compatible with sorting/heat. */
const endOfWeek = () => fmt(today.endOf("week"));
const endOfMonth = () => fmt(today.endOf("month"));
const endOfYear = () => fmt(today.endOf("year"));

// ─── Projects ──────────────────────────────────────────────────────────────────
// Macro life areas. Entries reference these by the seed key below, resolved to
// generated ids at insert time so project_id foreign keys line up.

type ProjectSeed = {
  /** Stable key used by entry/diary seeds to point at this project. */
  key: string;
  title: string;
  status?: "active" | "archived";
};

const PROJECT_SEEDS: ProjectSeed[] = [
  { key: "studio", title: "Studio rebrand" },
  { key: "collective", title: "Art collective" },
  { key: "synapse", title: "Synapse app" },
];

// ─── Entries ───────────────────────────────────────────────────────────────────

type Seed = {
  title: string;
  type: "todo" | "deadline" | "idea";
  subtitle?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  due_date?: string;
  due_time?: string;
  /** Horizon window. When set, due_date must hold the window's end date. */
  due_range?: "week" | "month" | "year";
  status?: string;
  /** Owning project (key into PROJECT_SEEDS); null/omitted = unfiled. */
  project?: string;
  /** For ideas only: this idea was promoted into the given project (provenance). */
  promoted?: string;
  /** DEV: how long ago this was last touched — drives the Present freshness fade. */
  touchedDaysAgo?: number;
  /** DEV: created N days ago — drives the narrative "waiting / sketched N ago" lines. */
  createdDaysAgo?: number;
};

const SEEDS: Seed[] = [
  // ── Bills & precise deadlines — overdue → distant ──────────────────────
  { title: "Electricity bill", type: "deadline", due_date: d(-2), status: "overdue", createdDaysAgo: 12 }, // looming + waited a while
  { title: "Rent", type: "deadline", due_date: d(1), due_time: "09:00 AM" }, // looming (tomorrow)
  { title: "Phone bill", type: "deadline", due_date: d(4) }, // near
  { title: "Car insurance renewal", type: "deadline", due_date: d(23) }, // distant
  { title: "Passport expires", type: "deadline", due_date: d(180) }, // distant

  // ── Horizon deadlines — commitments with a window, not a precise day ────
  { title: "Book the dentist", type: "deadline", due_range: "week", due_date: endOfWeek(), createdDaysAgo: 10 }, // the canonical "waiting 10 days"
  { title: "File the quarterly taxes", type: "deadline", due_range: "month", due_date: endOfMonth(), project: "studio" },
  { title: "Renew the studio lease", type: "deadline", due_range: "year", due_date: endOfYear(), project: "studio" },

  // ── Ideas — undated; staggered freshness so the margins read as a real
  //    field of thoughts (fresh → old). One is already promoted. ────────────
  { title: "Newsletter about small tools", type: "idea", subtitle: "weekly, short", touchedDaysAgo: 0, createdDaysAgo: 0 },
  { title: "An app that names your plants", type: "idea", touchedDaysAgo: 1, createdDaysAgo: 1 },
  { title: "Tiny zine on city benches", type: "idea", touchedDaysAgo: 2, createdDaysAgo: 2, project: "collective" },
  { title: "A font made from my handwriting", type: "idea", touchedDaysAgo: 9, createdDaysAgo: 11 }, // stale → resurfaced by narrative
  { title: "Map every good espresso in town", type: "idea", touchedDaysAgo: 13, createdDaysAgo: 16 },
  // Promoted idea: survives as provenance of the project it became.
  { title: "A shared sketch wall", type: "idea", touchedDaysAgo: 20, createdDaysAgo: 40, promoted: "collective" },

  // ── To-dos — today → next week, some filed under projects ──────────────
  { title: "Reply to Marco", type: "todo", scheduled_date: d(0) }, // looming (today)
  { title: "Export the new logo set", type: "todo", scheduled_date: d(0), project: "studio" },
  { title: "Pick up dry cleaning", type: "todo", scheduled_date: d(3) }, // near
  { title: "Draft the migration plan", type: "todo", scheduled_date: d(2), project: "synapse" },
  { title: "Water the plants", type: "todo", scheduled_date: d(5) }, // near
  { title: "Deep-clean the kitchen", type: "todo", scheduled_date: d(12) }, // distant

  // ── A couple of recently-cleared stakes — the "crossed off this week" run.
  { title: "Send the invoices", type: "todo", scheduled_date: d(-1), status: "completed", touchedDaysAgo: 1, project: "studio" },
  { title: "Pay the water bill", type: "deadline", due_date: d(-3), status: "met", touchedDaysAgo: 2 },

  // ── "Someday" — undated todos. No date = a someday, surfaced by the badge
  //    (render-time, not a separate type). Staggered freshness. ─────────────
  { title: "Visit the Dolomites", type: "todo", touchedDaysAgo: 2 },
  { title: "Read the Neapolitan novels", type: "todo", touchedDaysAgo: 9 },
  { title: "Take a pottery class", type: "todo", touchedDaysAgo: 20 },
];

// ─── Diary traces ────────────────────────────────────────────────────────────
// Notes are never actionable and never appear on the field, but the home's
// narrative voice reads yesterday's trace back. One free note from last night;
// one filed under a project to exercise linked_project_id.

type DiarySeed = {
  body: string;
  mood?: "calm" | "low" | "charged" | "tired" | "bright";
  /** Link to a project (key into PROJECT_SEEDS). */
  project?: string;
  createdDaysAgo: number;
};

const DIARY_SEEDS: DiarySeed[] = [
  {
    body: "Spent the evening sketching the new mark — something between a node and a leaf finally clicked.",
    mood: "bright",
    project: "studio",
    createdDaysAgo: 1, // yesterday → surfaces as the home's opening trace
  },
  {
    body: "Quiet day. Read on the balcony and let the to-do list wait.",
    mood: "calm",
    createdDaysAgo: 3,
  },
];

export async function seedDevDataIfEmpty(
  db: SQLite.SQLiteDatabase,
): Promise<boolean> {
  if (!__DEV__) return false;

  const row = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) as n FROM entries",
  );
  if ((row?.n ?? 0) > 0) return false;

  const now = Math.floor(Date.now() / 1000);
  const DAY_SECS = 86_400;

  // 1. Projects first, so entries/notes can reference their ids.
  const projectId: Record<string, string> = {};
  for (const p of PROJECT_SEEDS) {
    const id = generateId();
    projectId[p.key] = id;
    await db.runAsync(
      `INSERT INTO projects (id, title, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      id,
      p.title,
      p.status ?? "active",
      now,
      now,
    );
  }

  // 2. Entries, with project_id / due_range / promoted_project_id wired up.
  for (const s of SEEDS) {
    const touched = now - (s.touchedDaysAgo ?? 0) * DAY_SECS;
    const created = now - (s.createdDaysAgo ?? s.touchedDaysAgo ?? 0) * DAY_SECS;
    await db.runAsync(
      `INSERT INTO entries
       (id, title, type, subtitle, inspiration, scheduled_date, scheduled_time, due_date, due_time, notes, status, recurrence_rule, recurrence_end_date, project_id, due_range, promoted_project_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      generateId(),
      s.title,
      s.type,
      s.subtitle ?? null,
      null,
      s.scheduled_date ?? null,
      s.scheduled_time ?? null,
      s.due_date ?? null,
      s.due_time ?? null,
      null,
      s.status ?? (s.type === "deadline" ? "pending" : "scheduled"),
      null,
      null,
      s.project ? projectId[s.project] ?? null : null,
      s.due_range ?? null,
      s.promoted ? projectId[s.promoted] ?? null : null,
      created,
      touched,
    );
  }

  // 3. Diary traces — the narrative voice reads yesterday's note back.
  for (const n of DIARY_SEEDS) {
    const created = now - n.createdDaysAgo * DAY_SECS;
    await db.runAsync(
      `INSERT INTO diary_entries
       (id, body, mood, linked_entry_id, linked_project_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      generateId(),
      n.body,
      n.mood ?? null,
      null,
      n.project ? projectId[n.project] ?? null : null,
      created,
      created,
    );
  }

  console.log(
    `[dev-seed] inserted ${PROJECT_SEEDS.length} projects, ${SEEDS.length} entries, ${DIARY_SEEDS.length} diary notes`,
  );
  return true;
}
