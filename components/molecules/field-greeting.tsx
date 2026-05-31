import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { useTheme, tokens } from "@/constants/theme";

interface FieldGreetingProps {
  /** Current time, injected so the molecule stays pure. */
  now: Date;
  /** Total count of everything the user is carrying, across all types. */
  fieldCount: number;
}

function greetingFor(hour: number): string {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Field Lab's front-door greeting. A bold Inter line that reads like a status
 * report addressed to the person — the one element that owns the top of the home
 * screen and sets the activating, instrument-panel tone for everything below.
 */
export function FieldGreeting({
  now,
  fieldCount,
}: FieldGreetingProps): React.ReactElement {
  const { colors } = useTheme();

  const subtitle =
    fieldCount === 0
      ? "Your field is clear. Capture the first thing below."
      : `${fieldCount} ${fieldCount === 1 ? "thing" : "things"} in your field`;

  return (
    <View style={styles.wrap}>
      <ThemedText type="display" style={{ color: colors.ink }}>
        {greetingFor(now.getHours())}.
      </ThemedText>
      <ThemedText type="body" style={{ color: colors.inkMuted }}>
        {subtitle}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.space.xs,
    paddingTop: tokens.space.sm,
    paddingHorizontal: tokens.space.xs,
  },
});
