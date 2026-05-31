import dayjs from "dayjs";

import { generateId } from "@/lib/database";

import type * as SQLite from "expo-sqlite";

/**
 * DEV-ONLY mock data. Seeds a spread of entries across all five types and all
 * three urgency tiers (looming / near / distant) so the home screen's
 * weight-gradient is visible without hand-entering data. Runs once, only when
 * the table is empty, only under __DEV__. Never ships to production.
 */

const fmt = (d: dayjs.Dayjs) => d.format("DD/MM/YYYY");
const today = dayjs().startOf("day");
const d = (offset: number) => fmt(today.add(offset, "day"));

type Seed = {
  title: string;
  type: "todo" | "deadline" | "event" | "someday" | "idea";
  subtitle?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  due_date?: string;
  due_time?: string;
  status?: string;
  /** DEV: how long ago this was last touched — drives the Present freshness fade. */
  touchedDaysAgo?: number;
};

const SEEDS: Seed[] = [
  // ── Bills & deadlines — overdue → distant ──────────────────────────────
  { title: "Electricity bill", type: "deadline", due_date: d(-2), status: "overdue" }, // looming (overdue)
  { title: "Rent", type: "deadline", due_date: d(1), due_time: "09:00 AM" }, // looming (tomorrow)
  { title: "Phone bill", type: "deadline", due_date: d(4) }, // near
  { title: "Car insurance renewal", type: "deadline", due_date: d(23) }, // distant
  { title: "Passport expires", type: "deadline", due_date: d(180) }, // distant

  // ── Ideas — undated; staggered freshness so the Present fade is visible ─
  { title: "Newsletter about small tools", type: "idea", subtitle: "weekly, short", touchedDaysAgo: 0 },
  { title: "Repaint the hallway a warm white", type: "idea", touchedDaysAgo: 6 },
  { title: "Learn to make focaccia", type: "idea", touchedDaysAgo: 18 },
  { title: "An app that names your plants", type: "idea", touchedDaysAgo: 1 },
  { title: "Voice memos that auto-sort", type: "idea", touchedDaysAgo: 25 },

  // ── To-dos — today → next week ─────────────────────────────────────────
  { title: "Reply to Marco", type: "todo", scheduled_date: d(0) }, // looming (today)
  { title: "Book dentist", type: "todo", scheduled_date: d(0) }, // looming (today)
  { title: "Pick up dry cleaning", type: "todo", scheduled_date: d(3) }, // near
  { title: "Water the plants", type: "todo", scheduled_date: d(5) }, // near
  { title: "Deep-clean the kitchen", type: "todo", scheduled_date: d(12) }, // distant

  // ── Events — tomorrow → next month ─────────────────────────────────────
  { title: "Standup", type: "event", scheduled_date: d(1), scheduled_time: "10:30 AM" }, // looming
  { title: "Dinner with Sara", type: "event", scheduled_date: d(2), scheduled_time: "08:00 PM" }, // near
  { title: "Flight to Berlin", type: "event", scheduled_date: d(30), scheduled_time: "06:45 AM" }, // distant

  // ── Someday — staggered freshness too ──────────────────────────────────
  { title: "Visit the Dolomites", type: "someday", touchedDaysAgo: 2 },
  { title: "Read the Neapolitan novels", type: "someday", touchedDaysAgo: 9 },
  { title: "Take a pottery class", type: "someday", touchedDaysAgo: 20 },
  { title: "Build a standing desk", type: "someday", touchedDaysAgo: 14 },
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
  for (const s of SEEDS) {
    const touched = now - (s.touchedDaysAgo ?? 0) * DAY_SECS;
    await db.runAsync(
      `INSERT INTO entries
       (id, title, type, subtitle, inspiration, scheduled_date, scheduled_time, due_date, due_time, notes, status, recurrence_rule, recurrence_end_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      touched,
      touched,
    );
  }

  console.log(`[dev-seed] inserted ${SEEDS.length} mock entries`);
  return true;
}
