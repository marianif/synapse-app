import {
  EXPORT_FORMAT,
  EXPORT_FORMAT_VERSION,
  type SynapseExportCounts,
  type SynapseExportDocument,
  type SynapseExportPreferences,
} from "@/lib/export-format";
import { SCHEMA_VERSION } from "@/lib/schema";

/**
 * The import side of the archive format, pure and dependency-free so parsing,
 * validation, and row mapping stay unit-testable. `lib/import.ts` owns the
 * file picker, unzip, media, and database layers that consume this.
 *
 * Import is deliberately tolerant: an archive from an older app version maps
 * through the current column whitelist (missing columns fall to schema
 * defaults, unknown keys are ignored). An archive from a newer schema is
 * refused rather than silently mistranslated.
 */

export const ARCHIVE_TABLE_NAMES = {
  entries: "entries",
  projects: "projects",
  diaryEntries: "diary_entries",
  tasks: "tasks",
  recurrenceCompletions: "recurrence_completions",
  habits: "habits",
  habitCompletions: "habit_completions",
} as const;

export type ArchiveTable = keyof typeof ARCHIVE_TABLE_NAMES;

export type ArchiveRow = Record<string, unknown>;
export type ArchiveRows = Record<ArchiveTable, ArchiveRow[]>;

export type ArchiveErrorCode =
  | "malformed"
  | "bad_format"
  | "unsupported_format_version"
  | "unsupported_schema"
  | "missing_data";

export interface ArchiveError {
  code: ArchiveErrorCode;
  message: string;
}

export type ParseArchiveResult =
  | { ok: true; document: SynapseExportDocument; warnings: string[] }
  | { ok: false; error: ArchiveError };

/**
 * Every column the current schema can accept, per table. A row key not in its
 * table's whitelist is dropped; a whitelisted column absent from the archive
 * is omitted from the insert so the schema default applies.
 */
const ARCHIVE_COLUMNS: Record<ArchiveTable, readonly string[]> = {
  entries: [
    "id",
    "title",
    "type",
    "subtitle",
    "inspiration",
    "scheduled_date",
    "scheduled_time",
    "due_date",
    "due_time",
    "notes",
    "status",
    "recurrence_rule",
    "recurrence_end_date",
    "project_id",
    "due_range",
    "promoted_project_id",
    "is_next",
    "next_marked_at",
    "media",
    "created_at",
    "updated_at",
  ],
  projects: [
    "id",
    "title",
    "status",
    "emoji",
    "is_featured",
    "description",
    "last_opened_at",
    "created_at",
    "updated_at",
  ],
  diaryEntries: [
    "id",
    "body",
    "mood",
    "linked_entry_id",
    "linked_project_id",
    "tags",
    "media",
    "bookmarked",
    "created_at",
    "updated_at",
  ],
  tasks: [
    "id",
    "entry_id",
    "title",
    "done",
    "position",
    "created_at",
    "updated_at",
  ],
  recurrenceCompletions: [
    "id",
    "entry_id",
    "instance_date",
    "status",
    "created_at",
  ],
  habits: [
    "id",
    "title",
    "motivation",
    "emoji",
    "color_hue",
    "cadence",
    "start_date",
    "end_date",
    "reminder_time",
    "project_id",
    "status",
    "created_at",
    "updated_at",
  ],
  habitCompletions: [
    "id",
    "habit_id",
    "instance_date",
    "status",
    "created_at",
  ],
};

const DEFAULT_PREFERENCES: SynapseExportPreferences = {
  theme: "system",
  notifications: { deadlines: true, projectReturns: true, habits: true },
  confirmSkips: {
    delete_entry: false,
    delete_note: false,
    delete_project: false,
    delete_task: false,
    delete_habit: false,
  },
  deadlineLeadMinutes: 0,
  dormantReminderBehavior: "drop",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(code: ArchiveErrorCode, message: string): ParseArchiveResult {
  return { ok: false, error: { code, message } };
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function tableRows(
  value: unknown,
  table: ArchiveTable,
  warnings: string[],
): ArchiveRow[] {
  if (!Array.isArray(value)) {
    warnings.push(`No ${table} found in the archive.`);
    return [];
  }
  return value.filter(isRecord);
}

function normalizePreferences(
  value: unknown,
  warnings: string[],
): SynapseExportPreferences {
  if (!isRecord(value)) {
    warnings.push("No preferences found in the archive; keeping the defaults.");
    return {
      ...DEFAULT_PREFERENCES,
      notifications: { ...DEFAULT_PREFERENCES.notifications },
      confirmSkips: { ...DEFAULT_PREFERENCES.confirmSkips },
    };
  }

  const theme =
    value.theme === "light" || value.theme === "dark" || value.theme === "system"
      ? value.theme
      : DEFAULT_PREFERENCES.theme;

  const notificationsValue = isRecord(value.notifications)
    ? value.notifications
    : {};
  const notifications = {
    deadlines:
      typeof notificationsValue.deadlines === "boolean"
        ? notificationsValue.deadlines
        : DEFAULT_PREFERENCES.notifications.deadlines,
    projectReturns:
      typeof notificationsValue.projectReturns === "boolean"
        ? notificationsValue.projectReturns
        : DEFAULT_PREFERENCES.notifications.projectReturns,
    habits:
      typeof notificationsValue.habits === "boolean"
        ? notificationsValue.habits
        : DEFAULT_PREFERENCES.notifications.habits,
  };

  const skipsValue = isRecord(value.confirmSkips) ? value.confirmSkips : {};
  const confirmSkips = {} as SynapseExportPreferences["confirmSkips"];
  for (const key of Object.keys(
    DEFAULT_PREFERENCES.confirmSkips,
  ) as (keyof SynapseExportPreferences["confirmSkips"])[]) {
    confirmSkips[key] =
      typeof skipsValue[key] === "boolean"
        ? (skipsValue[key] as boolean)
        : DEFAULT_PREFERENCES.confirmSkips[key];
  }

  const lead = value.deadlineLeadMinutes;
  const deadlineLeadMinutes =
    lead === 0 || lead === 10 || lead === 30 || lead === 60 || lead === 1440
      ? lead
      : DEFAULT_PREFERENCES.deadlineLeadMinutes;

  const dormant = value.dormantReminderBehavior;
  const dormantReminderBehavior =
    dormant === "drop" || dormant === "summary" || dormant === "staggered"
      ? dormant
      : DEFAULT_PREFERENCES.dormantReminderBehavior;

  return {
    theme,
    notifications,
    confirmSkips,
    deadlineLeadMinutes,
    dormantReminderBehavior,
  };
}

/**
 * Parse and validate the archive's `synapse.json` payload. Never throws: a
 * malformed or foreign file comes back as a typed error the UI can surface.
 */
export function parseArchive(json: string): ParseArchiveResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return fail("malformed", "That file isn't a Synapse archive.");
  }

  if (!isRecord(parsed)) {
    return fail("malformed", "That file isn't a Synapse archive.");
  }

  if (parsed.format !== EXPORT_FORMAT) {
    return fail("bad_format", "That file isn't a Synapse archive.");
  }

  const formatVersion = parsed.formatVersion;
  if (typeof formatVersion !== "number" || !Number.isFinite(formatVersion)) {
    return fail("malformed", "The archive's format stamp is unreadable.");
  }
  if (formatVersion < 1) {
    return fail("malformed", "The archive's format stamp is unreadable.");
  }
  if (formatVersion > EXPORT_FORMAT_VERSION) {
    return fail(
      "unsupported_format_version",
      "This archive was created by a newer version of Synapse.",
    );
  }

  const schemaVersion = parsed.schemaVersion;
  if (typeof schemaVersion !== "number" || !Number.isFinite(schemaVersion)) {
    return fail("malformed", "The archive's schema stamp is unreadable.");
  }
  if (schemaVersion < 1) {
    return fail("malformed", "The archive's schema stamp is unreadable.");
  }
  if (schemaVersion > SCHEMA_VERSION) {
    return fail(
      "unsupported_schema",
      "This archive was created by a newer version of Synapse.",
    );
  }

  const data = parsed.data;
  if (!isRecord(data)) {
    return fail("missing_data", "The archive is missing its data.");
  }

  const warnings: string[] = [];
  const entries = tableRows(data.entries, "entries", warnings);
  const projects = tableRows(data.projects, "projects", warnings);
  const diaryEntries = tableRows(data.diaryEntries, "diaryEntries", warnings);
  const tasks = tableRows(data.tasks, "tasks", warnings);
  const recurrenceCompletions = tableRows(
    data.recurrenceCompletions,
    "recurrenceCompletions",
    warnings,
  );
  const habits = tableRows(data.habits, "habits", warnings);
  const habitCompletions = tableRows(
    data.habitCompletions,
    "habitCompletions",
    warnings,
  );

  const counts: SynapseExportCounts = {
    entries: entries.length,
    projects: projects.length,
    diaryEntries: diaryEntries.length,
    tasks: tasks.length,
    recurrenceCompletions: recurrenceCompletions.length,
    habits: habits.length,
    habitCompletions: habitCompletions.length,
    media: stringArray(parsed.media).length,
  };

  const document: SynapseExportDocument = {
    format: EXPORT_FORMAT,
    formatVersion,
    schemaVersion,
    appVersion: typeof parsed.appVersion === "string" ? parsed.appVersion : "unknown",
    exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : "",
    counts,
    preferences: normalizePreferences(parsed.preferences, warnings),
    media: stringArray(parsed.media),
    missingMedia: stringArray(parsed.missingMedia),
    data: {
      entries: entries as unknown as SynapseExportDocument["data"]["entries"],
      projects: projects as unknown as SynapseExportDocument["data"]["projects"],
      diaryEntries:
        diaryEntries as unknown as SynapseExportDocument["data"]["diaryEntries"],
      tasks: tasks as unknown as SynapseExportDocument["data"]["tasks"],
      recurrenceCompletions:
        recurrenceCompletions as unknown as SynapseExportDocument["data"]["recurrenceCompletions"],
      habits: habits as unknown as SynapseExportDocument["data"]["habits"],
      habitCompletions:
        habitCompletions as unknown as SynapseExportDocument["data"]["habitCompletions"],
    },
  };

  return { ok: true, document, warnings };
}

export interface MapArchiveOptions {
  /**
   * Archive paths whose bytes exist in the zip. A row's photo whose path is
   * absent is dropped from the row rather than left as a dangling reference.
   * Omitted means "assume every path in the document is present".
   */
  presentMedia?: ReadonlySet<string>;
  /**
   * Maps an archive path (`media/<file>`) to the URI stored on the device.
   * Defaults to identity, which is what the pure tests want.
   */
  resolveMediaUri?: (archivePath: string) => string;
}

function pickColumns(table: ArchiveTable, row: ArchiveRow): ArchiveRow {
  const picked: ArchiveRow = {};
  for (const column of ARCHIVE_COLUMNS[table]) {
    if (column in row && row[column] !== undefined) {
      picked[column] = row[column];
    }
  }
  return picked;
}

function mediaCell(
  value: unknown,
  isPresent: (path: string) => boolean,
  resolve: (path: string) => string,
): string | null {
  if (!Array.isArray(value)) return null;
  const items = value
    .filter(isRecord)
    .filter((item) => typeof item.uri === "string" && isPresent(item.uri))
    .map((item) => ({ ...item, uri: resolve(item.uri as string) }));
  return items.length > 0 ? JSON.stringify(items) : null;
}

/**
 * Turn a validated archive document into per-table rows the database layer can
 * insert. Keeps only whitelisted columns, serializes JSON cells (`media`,
 * `tags`) back to the strings SQLite stores, and resolves photo paths to their
 * on-device URIs.
 */
export function mapArchiveToRows(
  document: SynapseExportDocument,
  options: MapArchiveOptions = {},
): ArchiveRows {
  const { presentMedia, resolveMediaUri = (path: string): string => path } =
    options;
  const isPresent = presentMedia
    ? (path: string): boolean => presentMedia.has(path)
    : (): boolean => true;

  const entries = document.data.entries.map((entry) => {
    const source = entry as unknown as ArchiveRow;
    const row = pickColumns("entries", source);
    if ("media" in source) {
      row.media = mediaCell(source.media, isPresent, resolveMediaUri);
    }
    return row;
  });

  const diaryEntries = document.data.diaryEntries.map((note) => {
    const source = note as unknown as ArchiveRow;
    const row = pickColumns("diaryEntries", source);
    if ("media" in source) {
      row.media = mediaCell(source.media, isPresent, resolveMediaUri);
    }
    if (Array.isArray(source.tags)) {
      row.tags = source.tags.length > 0 ? JSON.stringify(source.tags) : null;
    }
    return row;
  });

  return {
    entries,
    projects: document.data.projects.map((row) =>
      pickColumns("projects", row as unknown as ArchiveRow),
    ),
    diaryEntries,
    tasks: document.data.tasks.map((row) =>
      pickColumns("tasks", row as unknown as ArchiveRow),
    ),
    recurrenceCompletions: document.data.recurrenceCompletions.map((row) =>
      pickColumns("recurrenceCompletions", row as unknown as ArchiveRow),
    ),
    habits: document.data.habits.map((row) =>
      pickColumns("habits", row as unknown as ArchiveRow),
    ),
    habitCompletions: document.data.habitCompletions.map((row) =>
      pickColumns("habitCompletions", row as unknown as ArchiveRow),
    ),
  };
}
