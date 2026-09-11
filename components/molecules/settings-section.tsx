import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

export interface SettingsSectionProps {
  /** All-caps mono kicker above the group — e.g. "PREFERENCES". */
  label: string;
  children: React.ReactNode;
}

/**
 * Settings group: a micro kicker over a stack of tonal rows. Structure comes
 * from the kicker and the inter-row gap (`space.xs`) — no card fill, no divider,
 * per Field Lab. Rows sit on `colors.surface`; the section sits on `paper`.
 */
export function SettingsSection({
  label,
  children,
}: SettingsSectionProps): React.ReactElement {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText
        type="micro"
        style={[styles.kicker, { color: colors.inkMuted }]}
      >
        {label}
      </ThemedText>
      <View style={styles.rows}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: tokens.space.md,
  },
  kicker: {
    marginLeft: tokens.space.xs,
  },
  rows: {
    gap: tokens.space.xs,
  },
});
