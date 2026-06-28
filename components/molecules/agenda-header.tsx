import dayjs from "dayjs";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

/**
 * Time-of-day greeting — the words the display line shows. Lives with the
 * header so all greeting copy sits in one place.
 */
export function greetingFor(hour: number): string {
  if (hour < 5) return "Still up.";
  if (hour < 12) return "Good morning.";
  if (hour < 18) return "Good afternoon.";
  return "Good evening.";
}

interface AgendaHeaderProps {
  /** A stable timestamp from the parent (no Date.now() in render paths). */
  now: Date;
}

/**
 * The page spine. An agenda page opens with its date, so the home does too:
 * the dated mono kicker is the printed part of the page, the greeting is the
 * companion looking up from it. No instrument readout — the voice below does
 * the talking now, and counting the field out loud was the dead console's job.
 */
export function AgendaHeader({ now }: AgendaHeaderProps): React.ReactElement {
  const { colors } = useTheme();
  const d = dayjs(now);

  return (
    <View style={styles.head}>
      <ThemedText type="label" style={{ color: colors.inkMuted }}>
        {d.format("ddd D MMM")}
      </ThemedText>
      <ThemedText type="display" style={{ color: colors.ink }}>
        {greetingFor(d.hour())}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.xs,
  },
});
