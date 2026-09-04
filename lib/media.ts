import { Directory, File, Paths } from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

import type { NoteMedia } from "@/lib/types";

/** Long-edge cap for imported note photos — keeps the local store light. */
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

/** The app-scoped directory that owns note photos. */
function mediaDirectory(): Directory {
  return new Directory(Paths.document, "media");
}

/**
 * Ensure the media directory exists. Cheap after the first call; expo-file
 * system's create is idempotent-ish, so a re-create that already exists is
 * tolerated (the class exposes `exists`).
 */
export async function ensureMediaDir(): Promise<Directory> {
  const dir = mediaDirectory();
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/**
 * Import a picked photo into the app's media directory: downscale to
 * `MAX_DIMENSION` on its long edge, re-encode as JPEG at `JPEG_QUALITY`, and
 * copy into the media dir under a generated id. The returned `NoteMedia`
 * carries the app-scoped URI, so it survives restarts and is never a picker
 * temp path. Throws on failure — the caller surfaces it.
 */
export async function importPhoto(sourceUri: string): Promise<NoteMedia> {
  const dir = await ensureMediaDir();
  const result = await manipulateAsync(
    sourceUri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: JPEG_QUALITY, format: SaveFormat.JPEG },
  );

  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const target = new File(dir, `${id}.jpg`);
  if (target.exists) target.delete();
  const source = new File(result.uri);
  source.copy(target);

  return {
    uri: target.uri,
    kind: "image",
    width: result.width,
    height: result.height,
  };
}

/**
 * Delete an attached photo file from the media directory. Swallows a missing
 * file (already gone / hand-edited rows) and logs unexpected failures.
 */
export async function deleteMediaFile(uri: string): Promise<void> {
  const file = new File(uri);
  if (!file.exists) return;
  try {
    file.delete();
  } catch (error) {
    console.error(`Failed to delete media file ${uri}:`, error);
  }
}