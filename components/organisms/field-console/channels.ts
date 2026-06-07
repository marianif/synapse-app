import type { EntryType } from "@/lib/types";

/**
 * One seed-able channel of the field: a type, the lane it belongs to, a plain
 * invite for what a tap does, and a faint ghost example of what it would hold.
 * Shared by every empty-field variant (constellation, orbit) so the copy and the
 * affordance stay identical across designs — only the staging differs.
 */
export type Channel = {
  type: EntryType;
  /** "stakes" = things with consequence; "present" = things to keep alive. */
  lane: "stakes" | "present";
  /** All-caps channel name. */
  label: string;
  /** What a tap does, in plain words ("plant a due", "catch a thought"). */
  invite: string;
  /** A faint example of what this channel would hold once it has signal. */
  ghost: string;
};

/** The five channels, in board order (stakes first, then present). */
export const CHANNELS: Channel[] = [
  {
    type: "deadline",
    lane: "stakes",
    label: "Bills",
    invite: "plant a due date",
    ghost: "Electric bill · 3d",
  },
  {
    type: "todo",
    lane: "stakes",
    label: "Todo",
    invite: "plant a task",
    ghost: "Reply to Sam · now",
  },
  {
    type: "idea",
    lane: "present",
    label: "Ideas",
    invite: "catch a thought",
    ghost: "Podcast about cities",
  },
  {
    type: "event",
    lane: "present",
    label: "Event",
    invite: "pin a date",
    ghost: "Dentist · Fri 9:00",
  },
  {
    type: "someday",
    lane: "present",
    label: "Someday",
    invite: "park a maybe",
    ghost: "Learn to sail",
  },
];

export const STAKE_CHANNELS = CHANNELS.filter((c) => c.lane === "stakes");
export const PRESENT_CHANNELS = CHANNELS.filter((c) => c.lane === "present");
