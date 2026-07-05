import { useRouter } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

import { EntryDot } from "@/components/atoms/entry-dot";
import { ThemedText } from "@/components/atoms/themed-text";
import { SwipeableRow } from "@/components/organisms/swipeable-row";
import { tokens, useEntryKicker, useTheme } from "@/constants/theme";

import type { FieldRowItem } from "@/components/molecules/field-row";

interface NextUpChipProps {
  /** The single thing most worth a glance right now. */
  item: FieldRowItem;
  /** Delete the featured entry. When set, the chip swipes to reveal delete. */
  onDelete?: (id: string) => void;
}

/**
 * The "next" chip — the one thing the briefing points the eye at. A tappable
 * pill carrying a leading EntryDot, the title, an optional mono when-label,
 * and a type-colored arrow. Distinct from FieldRow (the glowing board row): this
 * is a compact summary chip that opens the entry's detail. With an onDelete
 * handler it swipes left to reveal a delete action (shared SwipeableRow).
 */
export function NextUpChip({
  item,
  onDelete,
}: NextUpChipProps): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const code = useEntryKicker(item.type);

  const chip = (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/detail",
          params: { id: item.id, entryType: item.type },
        })
      }
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}${item.when ? `, ${item.when}` : ""}`}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: colors.surface },
        tokens.elevation.tile,
        pressed && styles.chipPressed,
      ]}
    >
      <EntryDot type={item.type} size={6} />
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

  if (!onDelete) return chip;

  return (
    <SwipeableRow accentColor={code} onDelete={() => onDelete(item.id)}>
      {chip}
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    minHeight: 48,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.md,
    overflow: "hidden",
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipTitle: {
    flex: 1,
    marginRight: tokens.space.sm,
  },
  chipWhen: {
    marginRight: tokens.space.sm,
  },
});
