import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { FieldSummary } from "@/components/molecules/field-summary";
import { NextUpChip } from "@/components/molecules/next-up-chip";
import { tokens, useTheme } from "@/constants/theme";

import type { FieldRowItem } from "@/components/molecules/field-row";

interface FieldBriefingProps {
  /** Current time, injected so the molecule stays pure. */
  now: Date;
  /** STAKES rows (deadlines + todos), pre-sorted hottest-first. */
  stakes: FieldRowItem[];
  /** PRESENT rows (ideas + events + someday), pre-sorted hottest-first. */
  present: FieldRowItem[];
}

function greetingFor(hour: number): string {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** The single thing most worth a glance: the hottest stake if any are on the
 *  line, otherwise a present thing to keep alive, so it never only points at
 *  pressure. */
function nextUp(
  stakes: FieldRowItem[],
  present: FieldRowItem[],
): FieldRowItem | null {
  const hot = stakes.filter((s) => s.heat === "hot");
  return hot[0] ?? present[0] ?? stakes[0] ?? null;
}

/**
 * The companion's read of the field. Greets by time, speaks one conversational
 * count sentence (FieldSummary), points the eye at one thing (NextUpChip), and
 * closes with a mono status readout. Pure orchestration — each part owns itself.
 */
export function FieldBriefing({
  now,
  stakes,
  present,
}: FieldBriefingProps): React.ReactElement {
  const { colors } = useTheme();

  const next = nextUp(stakes, present);
  const total = stakes.length + present.length;
  const hotCount = stakes.filter((s) => s.heat === "hot").length;
  const captured = 0; // reserved: "+N today" once capture timestamps are read

  return (
    <View style={styles.wrap}>
      <ThemedText type="display" style={{ color: colors.ink }}>
        {`${greetingFor(now.getHours())}.`}
      </ThemedText>

      <FieldSummary stakes={stakes} present={present} />

      {next ? <NextUpChip item={next} /> : null}

      {total > 0 ? (
        <ThemedText
          type="label"
          style={[styles.readout, { color: colors.inkMuted }]}
        >
          {`${hotCount} HOT · ${present.length} PRESENT${
            captured > 0 ? ` · +${captured} TODAY` : ""
          }`}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.space.sm,
    paddingTop: tokens.space.sm,
    paddingHorizontal: tokens.space.xs,
  },
  readout: {
    marginTop: tokens.space.xs,
    paddingHorizontal: tokens.space.xs,
  },
});
