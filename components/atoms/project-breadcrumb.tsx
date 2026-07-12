import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

type ProjectBreadcrumbProps = {
  emoji: string | null;
  title: string;
};

// Folder icon + truncated project label — links a detail surface back to its
// parent project.
export function ProjectBreadcrumb({
  emoji,
  title,
}: ProjectBreadcrumbProps): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View style={styles.breadcrumb}>
      <MaterialCommunityIcons
        name="folder-outline"
        size={13}
        color={colors.inkMuted}
      />
      <ThemedText
        type="micro"
        muted
        numberOfLines={1}
        style={styles.breadcrumbText}
      >
        {emoji ? `${emoji} ${title}` : title}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    marginBottom: tokens.space.md,
  },
  breadcrumbText: {
    flexShrink: 1,
  },
});
