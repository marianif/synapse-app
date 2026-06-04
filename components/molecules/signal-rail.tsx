import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import {
  chipInk,
  entryColor,
  tokens,
  useEntryKicker,
} from "@/constants/theme";

import type { EntryType } from "@/lib/types";

const TYPE_LABELS: Record<EntryType, string> = {
  todo: "TODO",
  deadline: "DEADLINE",
  event: "EVENT",
  someday: "ONE DAY",
  idea: "IDEA",
};

interface SignalRailProps {
  /** Entry type — drives the edge-bar hue, the kicker-tab fill, and the label. */
  entryType: EntryType;
  /** The display-scale entry title — the one zoomed-in item on the screen. */
  title: string;
  /** Recurring entries get a ↻ glyph inside the kicker tab. */
  isRecurring?: boolean;
  /** Telemetry / countdown / inspiration — composed by the caller, below title. */
  children?: React.ReactNode;
}

/**
 * The detail screen's identity block — the Field Lab signature grown to screen
 * scale, so the user never loses the thread "this is the [type] I just tapped".
 *
 * Where its board-scale siblings (FieldRow, NextUpChip) spread the type-color
 * across an edge-bar + glow wash, the rail is the family's RESTRAINED member:
 * the saturated charge concentrates into ONE bright mark — a solid type-color
 * kicker tab on the rail's shoulder — and everything else stays airy. The 3px
 * edge-bar is the literal thread from the board; the tab is where the identity
 * lands at full scale; the display title is the hero, one tight step below the
 * tab so tab + title read as a single unit. Children (the mono readout, a
 * deadline countdown, someday inspiration) hang below, the caller's to compose.
 *
 * The tab fills with `entryKicker` (the AA-verified darker shade) under
 * `chipInk` text — the one fill/text pairing the token system guarantees clears
 * contrast in both schemes. The brighter `entryColor` stays on the edge-bar,
 * where saturated codes belong.
 */
export function SignalRail({
  entryType,
  title,
  isRecurring = false,
  children,
}: SignalRailProps): React.ReactElement {
  const code = entryColor(entryType);
  const tabFill = useEntryKicker(entryType);

  return (
    <View style={styles.row}>
      <View style={[styles.edge, { backgroundColor: code }]} />

      <View style={styles.body}>
        {/* The one bright mark: a solid type-color tab carrying the label
            (and the repeats glyph, so "recurring" is part of the identity). */}
        <View style={[styles.tab, { backgroundColor: tabFill }]}>
          <ThemedText type="label" style={[styles.tabLabel, { color: chipInk() }]}>
            {TYPE_LABELS[entryType]}
            {isRecurring ? "  ↻" : ""}
          </ThemedText>
        </View>

        <ThemedText type="display" style={styles.title}>
          {title}
        </ThemedText>

        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: tokens.space.md,
  },
  // Thin thread from the board — the bar is the link, the tab is the identity.
  edge: {
    width: 3,
    borderRadius: tokens.radius.pill,
    alignSelf: "stretch",
  },
  body: {
    flex: 1,
  },
  // Solid type-color chip — hugs its text (never a full-width banner). Sharp
  // instrument corner, the Field Lab signal voice.
  tab: {
    alignSelf: "flex-start",
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
  },
  tabLabel: {
    // mono all-caps kicker on the filled tab — the only all-caps element.
  },
  title: {
    // display scale; the one zoomed-in item, one tight step under its tab so
    // tab + title read as a single identity unit.
    marginTop: tokens.space.xs,
  },
});
