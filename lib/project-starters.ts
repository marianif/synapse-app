import type { EntryType } from "@/lib/types";

/**
 * Starter prompts for an empty project — the "useful default" that keeps a
 * fresh project from ever reading as a void. Mirrors the projects-overview
 * philosophy: the default state is sensible pre-filled content, not an empty
 * state apologizing for itself.
 *
 * Two sources, ONE component (the screen renders both identically):
 *   - Seeded default projects (Work / Home / Body / Money / People / Making,
 *     matched by exact title) carry topic-suited prompts — a Body project's
 *     todo suggestion is "Book a workout", not a generic label. The head-start
 *     is real: tapping pre-fills the composer with the line, editable, one send
 *     from committing.
 *   - User-created projects (topic unknown) fall back to GENERIC_STARTERS — a
 *     neutral "First project todo / idea / deadline / note" per channel,
 *     opening the composer blank (there's nothing meaningful to pre-fill).
 *
 * The prompts are display-only until the user commits via the composer; they
 * are never seeded as real DB rows, so `isEmpty` holds until a real capture
 * lands. Voice per PRODUCT.md principle 6: plain, concrete, never a nag.
 */

// `note` isn't a real EntryType (it becomes a diary entry, not an entries
// row) — same bolt-on literal ProjectComposerKind uses.
export type StarterType = EntryType | "note";

// The four channels an empty project shows, in display order. Deadline reads
// as its own channel even though it's a todo flavor; note is the quietest.
export const STARTER_TYPES: readonly StarterType[] = [
  "todo",
  "idea",
  "deadline",
  "note",
] as const;

export type StarterPrompt = {
  type: StarterType;
  /** The row label AND the text pre-filled into the composer on tap. */
  text: string;
  /**
   * When true the composer opens with `text` already typed (a real head-start).
   * When false the row is a generic label and the composer opens blank — the
   * label taught what belongs there, but there's nothing worth pre-filling.
   */
  prefill: boolean;
};

// Generic channels for user-created projects. Labels only — composer opens blank.
const GENERIC_STARTERS: StarterPrompt[] = [
  { type: "todo", text: "First project todo", prefill: false },
  { type: "idea", text: "First project idea", prefill: false },
  { type: "deadline", text: "First project deadline", prefill: false },
  { type: "note", text: "First project note", prefill: false },
];

// Topic-suited prompts keyed by the exact seeded default-project title. The
// moment a user renames a default (or fills it with real work), the match drops
// and the generic set takes over — which is correct, it's no longer a pristine
// default. Keep keys in sync with DEFAULT_PROJECTS in lib/database.ts.
const DEFAULT_PROJECT_STARTERS: Record<string, StarterPrompt[]> = {
  Work: [
    { type: "todo", text: "Reply to the open thread", prefill: true },
    { type: "idea", text: "A better way to run the week", prefill: true },
    { type: "deadline", text: "Next review or check-in", prefill: true },
  ],
  Home: [
    { type: "todo", text: "The thing that keeps getting put off", prefill: true },
    { type: "idea", text: "One change that'd make the place easier", prefill: true },
    { type: "deadline", text: "A bill or renewal coming up", prefill: true },
  ],
  Body: [
    { type: "todo", text: "Book a workout", prefill: true },
    { type: "idea", text: "A sleep routine that sticks", prefill: true },
    { type: "deadline", text: "Dentist checkup", prefill: true },
  ],
  Money: [
    { type: "todo", text: "Review the subscriptions", prefill: true },
    { type: "idea", text: "An automatic savings rule", prefill: true },
    { type: "deadline", text: "Pay rent", prefill: true },
  ],
  People: [
    { type: "todo", text: "Text someone back", prefill: true },
    { type: "idea", text: "A trip worth planning together", prefill: true },
    { type: "deadline", text: "A birthday to remember", prefill: true },
  ],
  Making: [
    { type: "todo", text: "Sketch the next thing", prefill: true },
    { type: "idea", text: "The project you keep thinking about", prefill: true },
    { type: "deadline", text: "Ship a first version", prefill: true },
  ],
};

/**
 * The starter prompts for a project, ordered by STARTER_TYPES. A seeded default
 * (matched by exact, unmodified title) returns its topic-suited set; every other
 * project returns the generic set. Callers should only render these on a truly
 * empty project.
 */
export function starterPromptsFor(projectTitle: string): StarterPrompt[] {
  return DEFAULT_PROJECT_STARTERS[projectTitle] ?? GENERIC_STARTERS;
}
