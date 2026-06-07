import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";
import { useIncomingCount } from "@/hooks/use-incoming-count";
import { EntryCluster } from "../atoms/entry-cluster";
import { NotificationBadge } from "../atoms/notification-badge";
import { AppMenu } from "./app-menu";

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
  const [menuVisible, setMenuVisible] = useState(false);
  const incomingCount = useIncomingCount();

  return (
    <>
      <View style={styles.bar}>
        <View style={styles.brand}>
          <EntryCluster
            types={["deadline", "event", "todo", "someday", "idea"]}
            dotSize={7}
            gap={3}
            width={24}
          />

          <ThemedText type="headline" style={styles.wordmark}>
            Synapse
          </ThemedText>
        </View>

        <View style={styles.actions}>
          {/* Incoming tray — opens the temporal lane (deadlines, events,
              todos). Its badge counts what's due this week. */}
          <Pressable
            onPress={() => router.push("/list")}
            style={styles.iconBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              incomingCount > 0
                ? `Incoming, ${incomingCount} this week`
                : "Incoming"
            }
          >
            <MaterialCommunityIcons
              name="tray-arrow-down"
              size={22}
              color={colors.inkMuted}
            />
            <NotificationBadge count={incomingCount} />
          </Pressable>

          <Pressable
            onPress={() => router.push("/(tabs)/calendar")}
            style={styles.iconBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Calendar"
          >
            <MaterialCommunityIcons
              name="calendar"
              size={22}
              color={colors.inkMuted}
            />
          </Pressable>

          <Pressable
            onPress={() => setMenuVisible(true)}
            style={styles.iconBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Menu"
          >
            <MaterialCommunityIcons
              name="dots-vertical"
              size={22}
              color={colors.inkMuted}
            />
          </Pressable>
        </View>
      </View>

      <AppMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </>
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
