import { daysUntil } from "@/lib/direct-when";

import type { DbEntry, DbProject, DbTask, EntryType } from "@/lib/types";

/** The four useful reasons to interrupt the user's attention. */
export type AgendaPromptKind = "return" | "continue" | "prepare" | "decide";

export type AgendaPromptTarget =
  | { kind: "project"; id: string }
  | { kind: "entry"; id: string };

/**
 * An invitation, not a report. Every prompt gives the user one reason to care
 * and one clear way in.
 */
export interface AgendaPrompt {
  id: string;
  kind: AgendaPromptKind;
  /** The sentence that earns the user's attention. */
  title: string;
  /** Sentence pieces used to give only the entity the handwritten treatment. */
  titlePrefix: string;
  titleSuffix: string;
  subject: string;
  /** The smallest useful next move. */
  body: string;
  /** Compact evidence explaining why this is here now. */
  detail: string;
  actionLabel: string;
  target: AgendaPromptTarget;
  /** Used only to choose the primary invitation. Never shown as a score. */
  priority: number;
  /** Project keeps neutral ink; entries keep their existing type identity. */
  channel: EntryType | "project";
}

const PROJECT_RETURN_DAYS = 7;
const PREPARE_WINDOW_DAYS = 7;
const MAX_PROMPTS = 3;

const isDone = (entry: DbEntry): boolean =>
  entry.status === "completed" || entry.status === "met";

const toMs = (timestamp: number | null): number | null => {
  if (timestamp === null || timestamp === 0) return null;
  return timestamp < 1e11 ? timestamp * 1000 : timestamp;
};

const daysSince = (timestamp: number | null, now: number): number | null => {
  const ms = toMs(timestamp);
  if (ms === null) return null;
  return Math.max(0, Math.floor((now - ms) / 86_400_000));
};

const projectLastSeen = (project: DbProject): number | null =>
  project.last_opened_at ?? project.updated_at ?? project.created_at;

function dayPhrase(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function returnPrompts(
  entries: DbEntry[],
  projects: DbProject[],
  now: number,
): AgendaPrompt[] {
  return projects.flatMap((project) => {
    if (project.status !== "active") return [];

    const open = entries.filter(
      (entry) => entry.project_id === project.id && !isDone(entry),
    );
    if (open.length === 0) return [];

    const idle = daysSince(projectLastSeen(project), now);
    if (idle === null || idle < PROJECT_RETURN_DAYS) return [];

    const hasOneThing = open.length === 1;
    return [
      {
        id: `return-${project.id}`,
        kind: "return" as const,
        title: `There's a thread waiting in ${project.title}.`,
        titlePrefix: "There's a thread waiting in ",
        titleSuffix: ".",
        subject: project.title,
        body: hasOneThing
          ? "Open it and choose your next move."
          : "Open it and choose one thing to move.",
        detail: `${open.length} open ${open.length === 1 ? "thing" : "things"} · quiet for ${idle} days`,
        actionLabel: "Open project",
        target: { kind: "project", id: project.id } as const,
        priority: 900 + Math.min(idle, 30),
        channel: "project" as const,
      },
    ];
  });
}

function continuePrompts(
  entries: DbEntry[],
  tasks: DbTask[],
): AgendaPrompt[] {
  const byEntry = new Map<string, DbTask[]>();
  for (const task of tasks) {
    const current = byEntry.get(task.entry_id) ?? [];
    current.push(task);
    byEntry.set(task.entry_id, current);
  }

  return entries.flatMap((entry) => {
    if (isDone(entry)) return [];
    const own = byEntry.get(entry.id) ?? [];
    const done = own.filter((task) => task.done === 1).length;
    if (own.length === 0 || done === 0 || done === own.length) return [];

    return [
      {
        id: `continue-${entry.id}`,
        kind: "continue" as const,
        title: `You already started ${entry.title}.`,
        titlePrefix: "You already started ",
        titleSuffix: ".",
        subject: entry.title,
        body: "Continue from where you left off.",
        detail: `${done} of ${own.length} steps complete`,
        actionLabel: "Continue",
        target: { kind: "entry", id: entry.id } as const,
        priority: 720 + done,
        channel: entry.type,
      },
    ];
  });
}

function preparePrompts(entries: DbEntry[]): AgendaPrompt[] {
  return entries.flatMap((entry) => {
    if (isDone(entry)) return [];
    const days = daysUntil(entry.due_date ?? entry.scheduled_date ?? null);
    if (days === null || days > PREPARE_WINDOW_DAYS) return [];

    const urgent = days < 0;
    return [
      {
        id: `prepare-${entry.id}`,
        kind: "prepare" as const,
        title: urgent
          ? `${entry.title} needs a place to start.`
          : `${entry.title} is coming up.`,
        titlePrefix: "",
        titleSuffix: urgent ? " needs a place to start." : " is coming up.",
        subject: entry.title,
        body: urgent
          ? "Choose one small step and put it somewhere."
          : "Give it a place to start.",
        detail: urgent
          ? `${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} past due`
          : `Due ${dayPhrase(days)}`,
        actionLabel: urgent ? "Open item" : "Plan it",
        target: { kind: "entry", id: entry.id } as const,
        priority: urgent ? 850 + Math.min(Math.abs(days), 30) : 800 - days,
        channel: entry.type,
      },
    ];
  });
}

function decidePrompts(entries: DbEntry[], now: number): AgendaPrompt[] {
  return entries.flatMap((entry) => {
    if (entry.type !== "idea" || isDone(entry) || entry.promoted_project_id)
      return [];

    return [
      {
        id: `decide-${entry.id}`,
        kind: "decide" as const,
        title: `That idea is still here: ${entry.title}.`,
        titlePrefix: "That idea is still here: ",
        titleSuffix: ".",
        subject: entry.title,
        body: "Give it a home, keep it for later, or let it go.",
        detail: `Captured ${daysSince(entry.created_at, now) ?? 0} days ago · no project yet`,
        actionLabel: "Open idea",
        target: { kind: "entry", id: entry.id } as const,
        priority: 500,
        channel: "idea" as const,
      },
    ];
  });
}

function selectPrompts(candidates: AgendaPrompt[]): AgendaPrompt[] {
  const ranked = [...candidates].sort((a, b) => b.priority - a.priority);
  const selected: AgendaPrompt[] = [];
  const kinds = new Set<AgendaPromptKind>();
  const targets = new Set<string>();

  // The first pass gives the user a varied set of invitations. A second pass
  // fills remaining space only when the board has no variety to offer.
  for (const requireNewKind of [true, false]) {
    for (const prompt of ranked) {
      if (selected.length >= MAX_PROMPTS) return selected;
      const targetKey = `${prompt.target.kind}:${prompt.target.id}`;
      if (targets.has(targetKey)) continue;
      if (requireNewKind && kinds.has(prompt.kind)) continue;
      selected.push(prompt);
      kinds.add(prompt.kind);
      targets.add(targetKey);
    }
  }

  return selected;
}

/**
 * Build the Agenda's invitations. This is intentionally not a feed: it returns
 * one primary invitation and at most two alternatives, each with an action.
 */
export function agendaPrompts(input: {
  entries: DbEntry[];
  tasks: DbTask[];
  projects: DbProject[];
  now: number;
}): AgendaPrompt[] {
  const { entries, tasks, projects, now } = input;
  return selectPrompts([
    ...returnPrompts(entries, projects, now),
    ...preparePrompts(entries),
    ...continuePrompts(entries, tasks),
    ...decidePrompts(entries, now),
  ]);
}
