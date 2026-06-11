import { tokens } from "@/constants/theme";

import type { DiaryMood } from "@/lib/types";

import type { MoodOption } from "@/components/organisms/mood-sheet";

/**
 * Mood → electric type-code mapping for the diary's reflective layer. Moods are a
 * calm affective tag, never a score — each borrows the closest existing entry
 * code so the glyph reads at a glance without inventing a new token. Kept in
 * `lib/` (no React) so the composer, note rows, and screen all share one source.
 *
 * NOTE: the type palette is now three codes (ideas/todo/bills), so the five moods
 * reuse hues. A dedicated mood palette is a possible follow-up if distinct mood
 * colors matter; for now reuse is acceptable since moods are a quiet tag.
 */
export const MOODS: {
  value: DiaryMood;
  label: string;
  code: keyof typeof tokens.color.type;
}[] = [
  { value: "bright", label: "bright", code: "ideas" },
  { value: "calm", label: "calm", code: "ideas" },
  { value: "charged", label: "charged", code: "todo" },
  { value: "tired", label: "tired", code: "bills" },
  { value: "low", label: "low", code: "bills" },
];

/** Options for the `MoodSheet`, pre-resolved to concrete colors. */
export const MOOD_OPTIONS: MoodOption[] = MOODS.map((m) => ({
  value: m.value,
  label: m.label,
  color: tokens.color.type[m.code],
}));

/** Resolve a mood to its electric color, or `null` when unset/unknown. */
export function moodCode(mood: DiaryMood | null): string | null {
  const m = MOODS.find((x) => x.value === mood);
  return m ? tokens.color.type[m.code] : null;
}
