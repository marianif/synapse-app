import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";
import { EntryCluster } from "../atoms/entry-cluster";
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
  const [menuVisible, setMenuVisible] = useState(false);

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

        <Pressable
          onPress={() => setMenuVisible(true)}
          style={styles.iconBtn}
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name="menu"
            size={22}
            color={colors.inkMuted}
          />
        </Pressable>
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
