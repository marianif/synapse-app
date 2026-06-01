import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { entryColor, tokens, useTheme } from "@/constants/theme";

import type { FieldRowItem } from "@/components/molecules/field-row";

interface NextUpChipProps {
  /** The single thing most worth a glance right now. */
  item: FieldRowItem;
}

/**
 * The "next" chip — the one thing the briefing points the eye at. A tappable
 * pill carrying the type-color edge-bar, the title, an optional mono when-label,
 * and a type-colored arrow. Distinct from FieldRow (the glowing board row): this
 * is a compact summary chip that opens the entry's detail.
 */
export function NextUpChip({ item }: NextUpChipProps): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const code = entryColor(item.type);

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/detail", params: { id: item.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}${item.when ? `, ${item.when}` : ""}`}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: colors.surface },
        tokens.elevation.tile,
        pressed && styles.chipPressed,
      ]}
    >
      <View style={[styles.chipEdge, { backgroundColor: code }]} />
      <ThemedText
        type="item"
        numberOfLines={1}
        style={[styles.chipTitle, { color: colors.ink }]}
      >
        {item.title}
      </ThemedText>
      {item.when ? (
        <ThemedText
          type="mono"
          style={[styles.chipWhen, { color: colors.inkMuted }]}
        >
          {item.when}
        </ThemedText>
      ) : null}
      <ThemedText type="mono" style={{ color: code }}>
        →
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingLeft: tokens.space.md,
    paddingRight: tokens.space.md,
    borderRadius: tokens.radius.md,
    overflow: "hidden",
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipEdge: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  chipTitle: {
    flex: 1,
    marginRight: tokens.space.sm,
  },
  chipWhen: {
    marginRight: tokens.space.sm,
  },
});
