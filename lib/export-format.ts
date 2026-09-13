import { SCHEMA_VERSION } from "@/lib/schema";
import type {
  ConfirmKeyValue,
  DeadlineLeadMinutes,
  DormantReminderBehavior,
  NotificationPref,
  ThemePreference,
} from "@/lib/settings";
import type {
  DbDiaryEntry,
  DbEntry,
  DbHabit,
  DbHabitCompletion,
  DbProject,
  DbRecurrenceCompletion,
  DbTask,
} from "@/lib/types";

/**
 * The export document format, pure and dependency-free so the shape and media
 * rewriting stay unit-testable. `lib/export.ts` owns the filesystem and share
 * layers that consume this.
 *
 * The structured data lands in a versioned JSON document (`synapse.json`);
 * photos ride alongside as `media/<file>` entries inside the same archive. The
 * document carries `formatVersion` and `schemaVersion` so a future
 * import/restore can accept an archive without guessing what produced it.
 */

export const EXPORT_FORMAT = "synapse.export";
export const EXPORT_FORMAT_VERSION = 1;

export interface SynapseExportPreferences {
  theme: ThemePreference;
  notifications: Record<NotificationPref, boolean>;
  confirmSkips: Record<ConfirmKeyValue, boolean>;
  deadlineLeadMinutes: DeadlineLeadMinutes;
  dormantReminderBehavior: DormantReminderBehavior;
}

export interface SynapseExportCounts {
  entries: number;
  projects: number;
  diaryEntries: number;
  tasks: number;
  recurrenceCompletions: number;
  habits: number;
  habitCompletions: number;
  /** Photo files actually included in the archive. */
  media: number;
}

export interface SynapseExportDocument {
  format: typeof EXPORT_FORMAT;
  formatVersion: number;
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  counts: SynapseExportCounts;
  preferences: SynapseExportPreferences;
  /**
   * Archive-relative paths of the photo files bundled under `media/`. Rows may
   * reference a path that is absent here; `missingMedia` names those files.
   */
  media: string[];
  /**
   * Archive paths a row references whose file was missing on disk. The row's
   * reference survives in the JSON; the archive simply has no bytes for it.
   */
  missingMedia: string[];
  data: {
    entries: DbEntry[];
    projects: DbProject[];
    diaryEntries: DbDiaryEntry[];
    tasks: DbTask[];
    recurrenceCompletions: DbRecurrenceCompletion[];
    habits: DbHabit[];
    habitCompletions: DbHabitCompletion[];
  };
}

export interface ExportPayload {
  entries: DbEntry[];
  projects: DbProject[];
  diaryEntries: DbDiaryEntry[];
  tasks: DbTask[];
  recurrenceCompletions: DbRecurrenceCompletion[];
  habits: DbHabit[];
  habitCompletions: DbHabitCompletion[];
  preferences: SynapseExportPreferences;
  appVersion: string;
  exportedAt: string;
}

/** A photo referenced by a row: archive path plus the on-device source URI. */
export interface MediaSource {
  path: string;
  uri: string;
}

export interface BuiltExport {
  document: SynapseExportDocument;
  mediaSources: MediaSource[];
}

/**
 * The archive path for a media file: `media/<basename>`. App-scoped URIs are
 * machine-local, so exported references must be rewritten to paths that exist
 * inside the archive.
 */
export function mediaArchivePath(uri: string): string {
  const clean = uri.split("?")[0];
  const name = clean.slice(clean.lastIndexOf("/") + 1);
  return `media/${name || "unknown"}`;
}

/**
 * Assemble the export document from already-read payloads. Pure: no database
 * or filesystem access, so the shape and media rewriting are unit-testable.
 * Photos are collected into a deduped manifest keyed by archive path; each
 * row's `media` entries are rewritten to archive-relative URIs so the JSON is
 * self-consistent on its own.
 */
export function buildExportDocument(payload: ExportPayload): BuiltExport {
  const sources = new Map<string, MediaSource>();

  const collect = (uri: string): string => {
    const path = mediaArchivePath(uri);
    if (!sources.has(path)) sources.set(path, { path, uri });
    return path;
  };

  const entries: DbEntry[] = payload.entries.map((entry) => ({
    ...entry,
    media: entry.media.map((item) => ({ ...item, uri: collect(item.uri) })),
  }));

  const diaryEntries: DbDiaryEntry[] = payload.diaryEntries.map((note) => ({
    ...note,
    media: note.media.map((item) => ({ ...item, uri: collect(item.uri) })),
  }));

  const mediaSources = [...sources.values()].sort((a, b) =>
    a.path.localeCompare(b.path),
  );

  const document: SynapseExportDocument = {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    appVersion: payload.appVersion,
    exportedAt: payload.exportedAt,
    counts: {
      entries: entries.length,
      projects: payload.projects.length,
      diaryEntries: diaryEntries.length,
      tasks: payload.tasks.length,
      recurrenceCompletions: payload.recurrenceCompletions.length,
      habits: payload.habits.length,
      habitCompletions: payload.habitCompletions.length,
      media: mediaSources.length,
    },
    preferences: payload.preferences,
    media: mediaSources.map((source) => source.path),
    missingMedia: [],
    data: {
      entries,
      projects: payload.projects,
      diaryEntries,
      tasks: payload.tasks,
      recurrenceCompletions: payload.recurrenceCompletions,
      habits: payload.habits,
      habitCompletions: payload.habitCompletions,
    },
  };

  return { document, mediaSources };
}
