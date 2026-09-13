import { Directory, File, Paths } from "expo-file-system";
import { strFromU8, unzip, type Unzipped } from "fflate";
import { Platform } from "react-native";

import { restoreArchive } from "@/lib/database";
import type {
  SynapseExportCounts,
  SynapseExportDocument,
  SynapseExportPreferences,
} from "@/lib/export-format";
import {
  mapArchiveToRows,
  parseArchive,
  type ArchiveError,
} from "@/lib/import-format";
import {
  setConfirmSkip,
  setDeadlineLeadMinutes,
  setDormantReminderBehavior,
  setDormancyMarkers,
  setNotificationPref,
  setThemePreference,
  type ConfirmKeyValue,
} from "@/lib/settings";
import type { DbEntry, DbHabit, DbProject } from "@/lib/types";

/**
 * Import IO: pick a Synapse archive, unzip it, validate its document, restore
 * the photos into the app's media directory, replace the store transactionally,
 * and write the archived preferences back.
 *
 * Restore is replace-only by design: the archive is authoritative, so the
 * database is wiped and rebuilt rather than merged. The UI offers a safety
 * export before committing to it.
 */

export type ImportStage =
  | "picking"
  | "reading"
  | "extracting"
  | "media"
  | "restoring";

export interface ImportProgress {
  stage: ImportStage;
  done: number;
  total: number;
}

export interface ImportOptions {
  onProgress?: (progress: ImportProgress) => void;
}

export interface ImportResult {
  counts: SynapseExportCounts;
  preferences: SynapseExportPreferences;
  /**
   * The restored rows as validated, for the caller's post-import refresh:
   * notification rescheduling reads dates, statuses, and ids — never media.
   */
  entries: DbEntry[];
  projects: DbProject[];
  habits: DbHabit[];
}

/** The user backed out of the file picker. Not an error to surface. */
export class ImportCancelledError extends Error {
  constructor() {
    super("Import was cancelled.");
    this.name = "ImportCancelledError";
  }
}

/** The picked file is not a usable Synapse archive. */
export class ImportValidationError extends Error {
  readonly code: ArchiveError["code"];

  constructor(error: ArchiveError) {
    super(error.message);
    this.name = "ImportValidationError";
    this.code = error.code;
  }
}

/**
 * Both platforms reject the picker promise with a "cancelled by the user"
 * message (iOS: FilePickingCancelledException, Android: PickerCancelledException).
 */
function isPickerCancellation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes("cancel");
}

function extractArchive(bytes: Uint8Array<ArrayBuffer>): Promise<Unzipped> {
  return new Promise((resolve, reject) => {
    unzip(bytes, (error, data) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(data);
    });
  });
}

async function pickArchive(): Promise<File> {
  try {
    const picked = await File.pickFileAsync(undefined, "application/zip");
    if (Array.isArray(picked)) {
      const first = picked[0];
      if (!first) throw new ImportCancelledError();
      return first;
    }
    return picked;
  } catch (error) {
    if (error instanceof ImportCancelledError) throw error;
    if (isPickerCancellation(error)) throw new ImportCancelledError();
    throw error;
  }
}

/** Archive path -> file name inside the app's media directory. */
function mediaFileName(archivePath: string): string {
  return archivePath.slice(archivePath.lastIndexOf("/") + 1);
}

const MEDIA_DIR_NAME = "media";
const STAGING_DIR_NAME = "media-import";

/**
 * Write the archive's photos into a staging directory, returning the archive
 * paths whose bytes were written. Staging (rather than clearing the live media
 * directory) keeps the current photos intact until the database transaction
 * commits; a failed restore leaves both the old rows and their files in place.
 */
async function stageMedia(
  files: Unzipped,
  report: (progress: ImportProgress) => void,
): Promise<{ staging: Directory; present: Set<string> }> {
  const staging = new Directory(Paths.document, STAGING_DIR_NAME);
  if (staging.exists) staging.delete();
  staging.create({ intermediates: true });

  const paths = Object.keys(files).filter(
    (path) => path.startsWith("media/") && !path.endsWith("/"),
  );
  const present = new Set<string>();

  let done = 0;
  for (const path of paths) {
    done += 1;
    report({ stage: "media", done, total: paths.length });
    const target = new File(staging, mediaFileName(path));
    target.write(files[path]);
    present.add(path);
  }

  return { staging, present };
}

/** Swap the staged photos in, replacing whatever the old store referenced. */
function commitMedia(staging: Directory): void {
  const mediaDir = new Directory(Paths.document, MEDIA_DIR_NAME);
  if (mediaDir.exists) mediaDir.delete();
  staging.move(mediaDir);
}

async function applyPreferences(
  preferences: SynapseExportPreferences,
): Promise<void> {
  const { notifications, confirmSkips } = preferences;
  await setThemePreference(preferences.theme);
  await Promise.all([
    setNotificationPref("deadlines", notifications.deadlines),
    setNotificationPref("projectReturns", notifications.projectReturns),
    setNotificationPref("habits", notifications.habits),
    setDeadlineLeadMinutes(preferences.deadlineLeadMinutes),
    setDormantReminderBehavior(preferences.dormantReminderBehavior),
    // Project ids changed under a replace; stale dormancy markers must go.
    setDormancyMarkers({}),
    ...(Object.keys(confirmSkips) as ConfirmKeyValue[]).map((key) =>
      setConfirmSkip(key, confirmSkips[key]),
    ),
  ]);
}

/**
 * Run a full replace-restore from a user-picked archive. Throws
 * `ImportCancelledError` when the picker is dismissed and
 * `ImportValidationError` when the file is not a usable archive; the caller
 * surfaces the rest.
 */
export async function importData(
  options: ImportOptions = {},
): Promise<ImportResult> {
  if (Platform.OS === "web") {
    throw new Error("Import is available in the iOS and Android apps.");
  }

  const report = options.onProgress ?? (() => {});

  report({ stage: "picking", done: 0, total: 1 });
  const picked = await pickArchive();
  report({ stage: "picking", done: 1, total: 1 });

  report({ stage: "reading", done: 0, total: 1 });
  const bytes = new Uint8Array(await picked.bytes());
  report({ stage: "reading", done: 1, total: 1 });

  report({ stage: "extracting", done: 0, total: 1 });
  const files = await extractArchive(bytes);
  const manifest = files["synapse.json"];
  if (!manifest) {
    throw new ImportValidationError({
      code: "missing_data",
      message: "That file isn't a Synapse archive.",
    });
  }
  const parsed = parseArchive(strFromU8(manifest));
  if (!parsed.ok) throw new ImportValidationError(parsed.error);
  const document: SynapseExportDocument = parsed.document;
  report({ stage: "extracting", done: 1, total: 1 });

  const { staging, present } = await stageMedia(files, report);

  const rows = mapArchiveToRows(document, {
    presentMedia: present,
    resolveMediaUri: (archivePath) =>
      new File(Paths.document, MEDIA_DIR_NAME, mediaFileName(archivePath)).uri,
  });

  report({ stage: "restoring", done: 0, total: 1 });
  await restoreArchive(rows);
  commitMedia(staging);
  await applyPreferences(document.preferences);
  report({ stage: "restoring", done: 1, total: 1 });

  return {
    counts: { ...document.counts, media: present.size },
    preferences: document.preferences,
    entries: document.data.entries,
    projects: document.data.projects,
    habits: document.data.habits,
  };
}
