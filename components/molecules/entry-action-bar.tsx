import { StyleSheet, View } from "react-native";

import { DiscButton } from "@/components/atoms/disc-button";
import { tokens } from "@/constants/theme";
import type { EntryType } from "@/lib/types";

export interface EntryActionBarProps {
  type: EntryType;
  /** Entry is already completed/met — the primary action flips to reopen. */
  done: boolean;
  /** User-set next-action latch. */
  isNext: boolean;
  /** Complete, or reopen when `done`. */
  onComplete: () => void;
  onToggleNext: () => void;
}

/** The committing verb for an entry, in the app's plain voice. */
export function completeLabel(type: EntryType, done: boolean): string {
  if (done) return "Reopen";
  if (type === "deadline") return "Mark met";
  if (type === "idea") return "Archive";
  return "Mark complete";
}

/**
 * The /edit commit bar: two equal-width action keys — the committing verb
 * (Complete / Mark met / Archive, or Reopen when done) and the next-action
 * latch. Both are `DiscButton`s, so the colour lives on each key's glyph disc
 * rather than on two competing slabs; the committing key keeps the sanctioned
 * completion green, and the latch carries ink and inverts when on. A done entry's
 * verb is Reopen, which reverses completion, so it drops the green. Delete stays
 * tier-3 in the header — it is not a commit verb.
 */
export function EntryActionBar({
  type,
  done,
  isNext,
  onComplete,
  onToggleNext,
}: EntryActionBarProps): React.ReactElement {
  const primaryLabel = completeLabel(type, done);
  const nextLabel = isNext ? "Marked as next" : "Mark as next";

  return (
    <View style={styles.bar}>
      <DiscButton
        icon={done ? "Undo" : "Check"}
        label={primaryLabel}
        onPress={onComplete}
        tone={done ? "ink" : "success"}
        fill
      />

      {!done ? (
        <DiscButton
          icon="ArrowsRight"
          label={nextLabel}
          onPress={onToggleNext}
          tone="ink"
          selected={isNext}
          fill
          accessibilityLabel={isNext ? "Clear next action" : "Mark as next"}
          accessibilityHint="Flags this as the thing you are doing next"
          accessibilityState={{ selected: isNext }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: tokens.space.sm,
  },
});
