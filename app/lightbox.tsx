import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";

/**
 * Full-screen photo viewer for a note's attached image — a modal Stack screen
 * pushed from any DiaryNote thumbnail. Plain full-bleed image on a near-black
 * ground with a floating close key; no chrome, no zoom (kept deliberately
 * minimal for a first pass).
 */
export default function LightboxScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { uri } = useLocalSearchParams<{ uri?: string }>();

  return (
    <View style={styles.screen}>
      {uri ? (
        <Image
          source={uri}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          transition={150}
          accessibilityLabel="Note photo"
        />
      ) : null}

      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={[
          styles.close,
          { top: insets.top + tokens.space.md, backgroundColor: colors.paper },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Close photo"
      >
        <IconSymbol name="X" size={20} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
  },
  close: {
    position: "absolute",
    right: tokens.space.lg,
    width: 40,
    height: 40,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});