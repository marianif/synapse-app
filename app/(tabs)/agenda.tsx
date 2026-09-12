import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

/**
 * AGENDA — placeholder.
 *
 * The previous activation surface (flagged next actions plus the board's
 * openings, grouped by kind) has been removed. The tab stays so a new feature
 * can be built in its place.
 */
export default function AgendaScreen(): React.ReactElement {
  const { colors } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <ThemedText type="body" muted>
        Nothing here yet.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space.lg,
  },
});
