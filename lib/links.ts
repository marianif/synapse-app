/**
 * URL detection for free-text fields (diary note bodies, subtask titles).
 * Phase 1 is render-time only: `splitByUrls` recognizes URL runs inside a body
 * of text so the UI can style them as links without any storage or schema
 * change. Structured link attachments (with rich preview metadata) land in a
 * later phase on top of the same recognition.
 */

export interface LinkSegment {
  /** Visible spelling of the run. */
  text: string;
  /** Normalized href opened on tap; null for plain prose runs. */
  url: string | null;
}

/**
 * A URL run: scheme-prefixed (`http://…`, `https://…`) or a bare `www.…`.
 * The character class stops at whitespace and the quote/angle brackets so a
 * run never swallows neighboring markup or the next word.
 */
const URL_PATTERN = /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+/gi;

/** Punctuation that can legitimately follow a URL inside prose. Parens are
 *  handled separately (balancing, see `splitByUrls`) so a closing paren that
 *  belongs to the URL survives. */
const TRAILING_PUNCTUATION = /[.,;:!?\]}>"'”’»…]+$/;

function countChar(value: string, char: string): number {
  let count = 0;
  for (const c of value) {
    if (c === char) count += 1;
  }
  return count;
}

/**
 * Split `text` into alternating plain and URL runs.
 *
 * Trailing punctuation is trimmed off the URL ("see https://x.dev." keeps the
 * period in the prose), with closing-paren balancing so a link like
 * "(https://x.dev/a(b))" survives with both parens intact.
 */
export function splitByUrls(text: string): LinkSegment[] {
  const segments: LinkSegment[] = [];
  let cursor = 0;
  // Punctuation trimmed off a URL run is prose, not link — held back and
  // prepended to the next plain run so a sentence stays whole ("…x.dev, and
  // done" renders as one prose run after the link, not a stray comma).
  let pending = "";
  URL_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = URL_PATTERN.exec(text)) !== null) {
    const raw = match[0];
    const start = match.index;
    let url = raw.replace(TRAILING_PUNCTUATION, "");
    while (
      url.endsWith(")") &&
      countChar(url, "(") < countChar(url, ")")
    ) {
      url = url.slice(0, -1);
    }
    const leading = text.slice(cursor, start);
    if (leading.length > 0 || pending.length > 0) {
      segments.push({ text: pending + leading, url: null });
      pending = "";
    }
    if (url.length > 0) {
      segments.push({ text: url, url });
      if (url.length < raw.length) pending = raw.slice(url.length);
    } else {
      segments.push({ text: raw, url: null });
    }
    cursor = start + raw.length;
  }
  const tail = text.slice(cursor);
  if (tail.length > 0 || pending.length > 0) {
    segments.push({ text: pending + tail, url: null });
  }
  return segments;
}

/**
 * Normalize a recognized URL run into an openable href. Bare `www.…` runs are
 * scheme-less by definition of the matcher; everything else is already
 * prefixed. The scheme check is case-insensitive — "HTTP://X.DEV" stays put.
 */
export function normalizeHref(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}