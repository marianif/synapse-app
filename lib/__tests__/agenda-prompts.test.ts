import dayjs from "dayjs";

import { agendaPrompts } from "@/lib/agenda-prompts";

import type { DbEntry, DbProject, DbTask } from "@/lib/types";

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;

const secondsAgo = (age: number): number => (NOW - age) / 1000;

const date = (offsetDays: number): string =>
  dayjs()
    .startOf("day")
    .add(offsetDays, "day")
    .format("DD/MM/YYYY");

function entry(overrides: Partial<DbEntry> = {}): DbEntry {
  return {
    id: "entry-1",
    title: "The thing",
    type: "todo",
    subtitle: null,
    inspiration: null,
    scheduled_date: null,
    scheduled_time: null,
    due_date: null,
    due_time: null,
    notes: null,
    status: "active",
    recurrence_rule: null,
    recurrence_end_date: null,
    project_id: null,
    due_range: null,
    promoted_project_id: null,
    media: [],
    created_at: secondsAgo(30 * DAY),
    updated_at: secondsAgo(30 * DAY),
    ...overrides,
  };
}

function project(overrides: Partial<DbProject> = {}): DbProject {
  return {
    id: "project-1",
    title: "Salute",
    status: "active",
    emoji: null,
    description: null,
    is_featured: 0,
    last_opened_at: NOW - 10 * DAY,
    created_at: secondsAgo(30 * DAY),
    updated_at: secondsAgo(30 * DAY),
    ...overrides,
  };
}

function task(overrides: Partial<DbTask> = {}): DbTask {
  return {
    id: "task-1",
    entry_id: "entry-1",
    title: "A step",
    done: 0,
    position: 0,
    created_at: secondsAgo(20 * DAY),
    updated_at: secondsAgo(20 * DAY),
    ...overrides,
  };
}

function prompts(input: {
  entries?: DbEntry[];
  tasks?: DbTask[];
  projects?: DbProject[];
}) {
  return agendaPrompts({
    entries: input.entries ?? [],
    tasks: input.tasks ?? [],
    projects: input.projects ?? [],
    now: NOW,
  });
}

describe("agendaPrompts", () => {
  test("returns no invitations for an empty board", () => {
    expect(prompts({})).toEqual([]);
  });

  test("offers a way back into a dormant project with open work", () => {
    const result = prompts({
      projects: [project()],
      entries: [entry({ project_id: "project-1" })],
    });

    expect(result[0]).toMatchObject({
      kind: "return",
      title: "There's a thread waiting in Salute.",
      body: "Open it and choose your next move.",
      actionLabel: "Open project",
      target: { kind: "project", id: "project-1" },
    });
  });

  test("does not invite a return when a project has no open work", () => {
    const result = prompts({
      projects: [project()],
      entries: [
        entry({
          project_id: "project-1",
          status: "completed",
        }),
      ],
    });

    expect(result).toEqual([]);
  });

  test("offers continuation for a partially completed checklist", () => {
    const result = prompts({
      entries: [entry({ title: "Pack kitchen" })],
      tasks: [
        task({ done: 1 }),
        task({ id: "task-2", position: 1 }),
      ],
    });

    expect(result).toContainEqual(
      expect.objectContaining({
        kind: "continue",
        title: "You already started Pack kitchen.",
        body: "Continue from where you left off.",
        actionLabel: "Continue",
      }),
    );
  });

  test("offers preparation for an approaching deadline without repeating its date", () => {
    const result = prompts({
      entries: [
        entry({
          id: "deadline-1",
          title: "Book dentist",
          type: "deadline",
          due_date: date(2),
        }),
      ],
    });

    const prepare = result.find((prompt) => prompt.kind === "prepare");
    expect(prepare).toMatchObject({
      title: "Book dentist is coming up.",
      body: "Give it a place to start.",
      actionLabel: "Plan it",
    });
    expect(prepare?.title).not.toMatch(/\d+d|tomorrow|today/);
  });

  test("offers a decision for an idea instead of calling it stale", () => {
    const result = prompts({
      entries: [
        entry({
          id: "idea-1",
          title: "Summer studio",
          type: "idea",
        }),
      ],
    });

    expect(result).toContainEqual(
      expect.objectContaining({
        kind: "decide",
        title: "That idea is still here: Summer studio.",
        body: "Give it a home, keep it for later, or let it go.",
        actionLabel: "Open idea",
      }),
    );
    expect(result.some((prompt) => /stale|nowhere|unfiled/i.test(prompt.title))).toBe(
      false,
    );
  });

  test("returns one primary invitation and at most two alternatives", () => {
    const result = prompts({
      projects: [project()],
      entries: [
        entry({ project_id: "project-1" }),
        entry({
          id: "deadline-1",
          title: "Book dentist",
          type: "deadline",
          due_date: date(1),
        }),
        entry({
          id: "idea-1",
          title: "Summer studio",
          type: "idea",
        }),
      ],
    });

    expect(result.length).toBeLessThanOrEqual(3);
    expect(result.every((prompt) => prompt.actionLabel.length > 0)).toBe(true);
    expect(new Set(result.map((prompt) => prompt.kind)).size).toBe(result.length);
  });
});
