/** Title stays glanceable up to here; longer captures spill into notes. */
export const CAPTURE_TITLE_MAX = 80;

/**
 * Split a free-form capture into a scannable title + overflow notes. The title
 * is the first line or sentence (whichever comes first), trimmed to
 * CAPTURE_TITLE_MAX at a word boundary; everything that didn't fit becomes
 * notes. Short captures return `notes: undefined` (the whole thing is the
 * title). Nothing typed is ever dropped.
 */
export function splitCapture(text: string): { title: string; notes?: string } {
  // First natural break: a newline or sentence terminator (. ! ?).
  const breakMatch = text.match(/[\n.!?]/);
  const firstClause = breakMatch
    ? text.slice(0, breakMatch.index! + 1).trim()
    : text;

  if (firstClause.length > CAPTURE_TITLE_MAX) {
    // Cut at the last word boundary before the cap so we don't split a word,
    // and keep the FULL original text in notes (nothing typed is dropped).
    const slice = firstClause.slice(0, CAPTURE_TITLE_MAX);
    const lastSpace = slice.lastIndexOf(" ");
    const title =
      (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim() + "…";
    return { title, notes: text };
  }

  // First clause fits: it's the title; anything after it becomes notes.
  const remainder = text.slice(firstClause.length).trim();
  return {
    title: firstClause,
    notes: remainder.length > 0 ? remainder : undefined,
  };
}
