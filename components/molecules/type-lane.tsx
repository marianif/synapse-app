import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import type { Scheme } from "@/constants/theme";
import { entryColor, entryKicker, tokens } from "@/constants/theme";
import type { EntryType } from "@/lib/types";

function typedTextColor(type: EntryType, scheme: Scheme): string {
  return scheme === "dark" ? entryKicker(type, "light") : entryColor(type);
}

export function TypeLane({
  variant,
  label,
  caption,
  scheme,
  ink,
  muted,
  onPress,
}: {
  variant: EntryType | "note";
  label: string;
  caption: string;
  scheme: Scheme;
  ink: string;
  muted: string;
  onPress: () => void;
}): React.ReactElement {
  const isNote = variant === "note";
  const dot = isNote ? muted : entryColor(variant);
  const kicker = isNote ? ink : typedTextColor(variant, scheme);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`File as ${label}`}
      style={({ pressed }) => [styles.typeLane, pressed && styles.pressed]}
    >
      <View style={styles.typeHead}>
        <View style={[styles.typeDot, { backgroundColor: dot }]} />
        <ThemedText type="mono" style={{ color: kicker }}>
          {label.toLowerCase()}
        </ThemedText>
      </View>
      <ThemedText
        type="caption"
        numberOfLines={1}
        style={[styles.typeCaption, { color: muted }]}
      >
        {caption}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  typeLane: {
    width: "48.7%",
    paddingVertical: tokens.space.xs,
    paddingHorizontal: 2,
    gap: 2,
  },
  typeHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
  typeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typeCaption: {
    paddingLeft: 14,
  },
  pressed: {
    opacity: 0.62,
  },
});
