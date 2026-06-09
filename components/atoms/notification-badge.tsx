import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

interface NotificationBadgeProps {
  /** When 0 the badge hides entirely. Above `max` it renders as "max+". */
  count: number;
  max?: number;
}

/**
 * A small clay pill that floats over a header control to flag incoming items.
 * Renders a numeral for counts; the deadline hue keeps it reading as a gentle
 * "needs attention" cue without alarming saturation. Hidden when count is 0.
 */
export function NotificationBadge({
  count,
  max = 9,
}: NotificationBadgeProps): React.ReactElement | null {
  const { colors } = useTheme();
  if (count <= 0) return null;

  const label = count > max ? `${max}+` : String(count);

  return (
    <View
      style={[
        styles.badge,
        // Border-matched to paper so the pill reads as lifted off the icon,
        // honoring the no-1px-stroke rule via a surface shift, not a border.
        { backgroundColor: colors.accent.clay, borderColor: colors.paper },
      ]}
      pointerEvents="none"
    >
      <ThemedText
        type="micro"
        style={[styles.label, { color: colors.accent.onClay }]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: tokens.radius.pill,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontWeight: "700",
    lineHeight: 14,
  },
});
