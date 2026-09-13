import Constants from "expo-constants";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { strToU8, zip } from "fflate";
import dayjs from "dayjs";
import { Platform } from "react-native";

import { ensureDb, parseMedia, parseTags } from "@/lib/database";
import {
  buildExportDocument,
  type ExportPayload,
  type SynapseExportPreferences,
} from "@/lib/export-format";
import {
  ConfirmKey,
  getConfirmSkip,
  getDeadlineLeadMinutes,
  getDormantReminderBehavior,
  getNotificationPref,
  getThemePreference,
  type ConfirmKeyValue,
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
 * Export IO: read every user table, bundle referenced photos, zip a
 * `synapse.json` plus `media/` files, and hand the result to the platform
 * share sheet (or a browser download on web).
 *
 * Strictly local: nothing leaves the device until the user picks a destination
 * in the share sheet.
 */

/** Raw SQLite rows carry JSON strings for these cells. */
type RawEntryRow = Omit<DbEntry, "media"> & { media: string | null };
type RawDiaryRow = Omit<DbDiaryEntry, "tags" | "media"> & {
  tags: string | null;
  media: string | null;
};

export type ExportStage = "reading" | "media" | "archiving" | "sharing";

export interface ExportProgress {
  stage: ExportStage;
  done: number;
  total: number;
}

export interface ExportOptions {
  onProgress?: (progress: ExportProgress) => void;
}

/** Read every user table plus the app preferences that shape the store. */
async function readExportPayload(): Promise<ExportPayload> {
  const db = await ensureDb();
  const [
    entryRows,
    projects,
    diaryRows,
    tasks,
    recurrenceCompletions,
    habits,
    habitCompletions,
  ] = await Promise.all([
    db.getAllAsync<RawEntryRow>("SELECT * FROM entries ORDER BY created_at ASC"),
    db.getAllAsync<DbProject>("SELECT * FROM projects ORDER BY created_at ASC"),
    db.getAllAsync<RawDiaryRow>(
      "SELECT * FROM diary_entries ORDER BY created_at ASC",
    ),
    db.getAllAsync<DbTask>("SELECT * FROM tasks ORDER BY position ASC"),
    db.getAllAsync<DbRecurrenceCompletion>(
      "SELECT * FROM recurrence_completions",
    ),
    db.getAllAsync<DbHabit>("SELECT * FROM habits"),
    db.getAllAsync<DbHabitCompletion>("SELECT * FROM habit_completions"),
  ]);

  const entries: DbEntry[] = entryRows.map((row) => ({
    ...row,
    media: parseMedia(row.media),
  }));

  const diaryEntries: DbDiaryEntry[] = diaryRows.map((row) => ({
    ...row,
    tags: parseTags(row.tags),
    media: parseMedia(row.media),
  }));

  return {
    entries,
    projects,
    diaryEntries,
    tasks,
    recurrenceCompletions,
    habits,
    habitCompletions,
    preferences: await readPreferences(),
    appVersion: Constants.expoConfig?.version ?? "unknown",
    exportedAt: new Date().toISOString(),
  };
}

async function readPreferences(): Promise<SynapseExportPreferences> {
  const confirmKeys = Object.values(ConfirmKey);
  const [
    theme,
    deadlines,
    projectReturns,
    habits,
    deadlineLeadMinutes,
    dormantReminderBehavior,
    ...confirmValues
  ] = await Promise.all([
    getThemePreference(),
    getNotificationPref("deadlines"),
    getNotificationPref("projectReturns"),
    getNotificationPref("habits"),
    getDeadlineLeadMinutes(),
    getDormantReminderBehavior(),
    ...confirmKeys.map((key) => getConfirmSkip(key)),
  ]);

  const confirmSkips = {} as Record<ConfirmKeyValue, boolean>;
  confirmKeys.forEach((key, index) => {
    confirmSkips[key] = confirmValues[index];
  });

  return {
    theme,
    notifications: { deadlines, projectReturns, habits },
    confirmSkips,
    deadlineLeadMinutes,
    dormantReminderBehavior,
  };
}

/** Promise wrapper over fflate's async `zip`, so the JS thread keeps yielding. */
function createZip(
  files: Record<string, Uint8Array>,
): Promise<Uint8Array<ArrayBuffer>> {
  return new Promise((resolve, reject) => {
    zip(files, { level: 6 }, (error, data) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(data);
    });
  });
}

function exportFileName(): string {
  return `synapse-export-${dayjs().format("YYYY-MM-DD")}.zip`;
}

/** Trigger a browser download. Web has no share sheet and no media bin. */
function downloadOnWeb(bytes: Uint8Array<ArrayBuffer>, fileName: string): void {
  const blob = new Blob([bytes], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Write the archive to the cache directory and open the platform share sheet,
 * which is how a user saves it to Files, AirDrops it, or sends it on. The
 * cache file is rewritten on each export and left for the system to reclaim;
 * deleting it the moment the sheet resolves can race the receiving app.
 */
async function shareArchive(
  bytes: Uint8Array<ArrayBuffer>,
  fileName: string,
): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Sharing is not available on this device.");
  }

  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.write(bytes);

  await Sharing.shareAsync(file.uri, {
    mimeType: "application/zip",
    UTI: "public.zip-archive",
    dialogTitle: "Export Synapse data",
  });
}

/**
 * Build and deliver a full export. Throws on failure; the caller surfaces it
 * and logs.
 */
export async function exportData(options: ExportOptions = {}): Promise<void> {
  const report = options.onProgress ?? (() => {});

  report({ stage: "reading", done: 0, total: 1 });
  const payload = await readExportPayload();
  const { document: exportDoc, mediaSources } = buildExportDocument(payload);
  report({ stage: "reading", done: 1, total: 1 });

  const files: Record<string, Uint8Array> = {};
  const resolved: string[] = [];

  // Web runs have no app-scoped media directory; the row references survive in
  // the JSON and `missingMedia` marks each file absent.
  if (Platform.OS !== "web") {
    let done = 0;
    for (const source of mediaSources) {
      done += 1;
      report({ stage: "media", done, total: mediaSources.length });
      try {
        const file = new File(source.uri);
        if (!file.exists) {
          exportDoc.missingMedia.push(source.path);
          continue;
        }
        files[source.path] = new Uint8Array(await file.bytes());
        resolved.push(source.path);
      } catch (error) {
        console.error(`[export] failed to read media ${source.uri}:`, error);
        exportDoc.missingMedia.push(source.path);
      }
    }
  } else {
    exportDoc.missingMedia.push(...mediaSources.map((source) => source.path));
  }

  exportDoc.media = resolved;
  exportDoc.counts.media = resolved.length;
  files["synapse.json"] = strToU8(JSON.stringify(exportDoc, null, 2));

  report({ stage: "archiving", done: 0, total: 1 });
  const archive = await createZip(files);
  report({ stage: "archiving", done: 1, total: 1 });

  report({ stage: "sharing", done: 0, total: 1 });
  const fileName = exportFileName();
  if (Platform.OS === "web") {
    downloadOnWeb(archive, fileName);
  } else {
    await shareArchive(archive, fileName);
  }
  report({ stage: "sharing", done: 1, total: 1 });
}
