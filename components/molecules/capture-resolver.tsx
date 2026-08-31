import type { LinkableIdea } from "@/components/organisms/link-sheet";
import type { DueRange } from "@/lib/types";

// A recent idea the captured thought can be filed under — same shape the link
// sheet uses, re-exported so call-sites can import it from either place.
export type { LinkableIdea };

/**
 * Where a captured thought is filed. `todo`/`deadline` carry the optional detail
 * the writer set in the inline panel; `idea`/`note`/`note-on` are bare. There is
 * no "more" escape hatch — the rich modal was retired and capture is the single
 * creation path (PRODUCT.md: one trigger, no second add).
 */
export type CaptureResolution =
  | {
      kind: "todo";
      scheduledDate?: string;
      scheduledTime?: string;
      projectId?: string;
    }
  | {
      kind: "deadline";
      dueDate?: string;
      dueTime?: string;
      dueRange?: DueRange;
      projectId?: string;
    }
  | { kind: "idea" }
  | { kind: "note" }
  | { kind: "note-on"; entryId: string };