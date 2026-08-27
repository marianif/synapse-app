import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { BrandMark } from "@/components/atoms/brand-mark";
import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

interface AppHeaderProps {
  onAvatarPress?: () => void;
  avatarUri?: string;
}

export function AppHeader({
  onAvatarPress,
  avatarUri,
}: AppHeaderProps): React.ReactElement {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.bar, { backgroundColor: colors.paper }]}>
      <View style={styles.brand}>
        <BrandMark size={24} />

        <ThemedText type="headline" style={styles.wordmark}>
          synapse
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => router.push("/settings")}
          style={styles.iconBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <MaterialCommunityIcons
            name="dots-vertical"
            size={22}
            color={colors.inkMuted}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
  iconBtn: {
    padding: tokens.space.xs,
  },
  wordmark: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
});
