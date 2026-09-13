import { hslToHex } from "@/lib/color";
import type { DbDiaryEntry } from "@/lib/types";

export interface TagCount {
  tag: string;
  count: number;
}

/**
 * Distinct tags across notes with frequencies, sorted by popularity then
 * alphabetically — the shared vocabulary of the notes tab's filter rail and
 * the note editor's add-field suggestions. One implementation, both surfaces.
 */
export function countTags(entries: DbDiaryEntry[]): TagCount[] {
  const counts = new Map<string, number>();
  for (const n of entries) {
    for (const t of n.tags) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * Suggest tags for the editor's add-field, in vocabulary order (popularity,
 * then alpha): prefix matches of the draft first, then substring matches —
 * capped at `limit` and excluding tags already on the note. An empty draft
 * returns the most-used tags overall (quick picks for discovery).
 */
export function suggestTags(
  vocab: TagCount[],
  draft: string,
  exclude: string[],
  limit = 6,
): string[] {
  const excluded = new Set(exclude);
  const q = draft.trim().toLowerCase();
  const prefix: string[] = [];
  const substring: string[] = [];
  for (const { tag } of vocab) {
    if (excluded.has(tag)) continue;
    if (!q || tag.startsWith(q)) prefix.push(tag);
    else if (tag.includes(q)) substring.push(tag);
  }
  return [...prefix, ...substring].slice(0, limit);
}

// ─── Per-tag tone ──────────────────────────────────────────────────────────────
// Every tag chip derives its palette from the tag's own text: a deterministic
// hue, rendered as two tones of the SAME hue — a recessed tinted well (bg)
// and a deeper/bright ink (fg). Deterministic across surfaces, so `work` is
// the same green chip in the feed, the rail, and the editor; and since the
// hue is picked by hash, neighboring tags naturally scatter around the wheel.

/** Stable 0–359 hue for a tag string. */
function tagHue(tag: string): number {
  let h = 0;
  for (let i = 0; i < tag.length; i++) {
    h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

export interface TagTone {
  /** The chip's recessed tinted well. */
  bg: string;
  /** The chip's same-hue ink (text, glyphs). */
  fg: string;
}

/**
 * A tag chip's two-tone palette, derived from the tag text — a soft pastel
 * pairing. Light: a barely-there tinted well with a muted pastel ink. Dark:
 * a desaturated dusk well with a bright pastel ink. The pairing inverts but
 * the hue stays identical.
 */
export function tagTone(tag: string, scheme: "light" | "dark"): TagTone {
  const hue = tagHue(tag);
  if (scheme === "dark") {
    return { bg: hslToHex(hue, 35, 28), fg: hslToHex(hue, 60, 78) };
  }
  return { bg: hslToHex(hue, 40, 92), fg: hslToHex(hue, 50, 36) };
}