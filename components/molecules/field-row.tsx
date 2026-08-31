import type { EntryType } from "@/lib/types";

/** How alive a row reads — drives glow intensity, never its position. */
export type Heat = "hot" | "warm" | "cool";

export interface FieldRowItem {
  id: string;
  type: EntryType;
  title: string;
  /** Absolute when-label: "Tomorrow", "2d overdue", "Thu", "Aug". */
  when?: string;
  heat: Heat;
}