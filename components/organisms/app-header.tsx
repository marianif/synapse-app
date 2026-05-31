import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { useTheme, tokens } from "@/constants/theme";
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

        <ThemedText type="headline" style={styles.wordmark}>
          Synapse
        </ThemedText>

        <Pressable onPress={onAvatarPress} style={styles.iconBtn} hitSlop={8}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatarFallback,
                { backgroundColor: colors.surface },
              ]}
            >
              <MaterialCommunityIcons
                name="account"
                size={20}
                color={colors.inkMuted}
              />
            </View>
          )}
        </Pressable>
      </View>

      <AppMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
  },
  iconBtn: {
    padding: tokens.space.xs,
  },
  wordmark: {
    flex: 1,
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
