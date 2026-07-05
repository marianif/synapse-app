import { Pressable, StyleSheet, View } from "react-native";

import { SketchIcon } from "@/components/atoms/sketch-icon";
import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { LinkableKind } from "@/components/organisms/link-sheet";
import { tokens, useTheme } from "@/constants/theme";

export type DiaryMacro = "all" | "linked" | "free";

const MACROS: { value: DiaryMacro; label: string }[] = [
  { value: "all", label: "All" },
  { value: "linked", label: "Linked" },
  { value: "free", label: "Free" },
];

interface DiaryFilterBarProps {
  macro: DiaryMacro;
  onMacro: (macro: DiaryMacro) => void;
  /** Title of the target currently filtered to (overrides macro), or null. */
  targetLabel: string | null;
  /** Kind of the target currently filtered to — decides the leading glyph. */
  targetKind: LinkableKind | null;
  /** Open the target-filter bottom sheet. */
  onOpenTargetFilter: () => void;
  /** Clear the target filter (back to the macro buckets). */
  onClearTarget: () => void;
}

/**
 * The notes filter row — editorial, not a control panel. Macro views (All /
 * Linked / Free) sit as a line of section labels; the active one is full-ink
 * with a thin underline. To the right, the target filter glyph opens the sheet.
 * When a target is picked the row steps aside so the target's name stands
 * centered with a clear.
 */
export function DiaryFilterBar({
  macro,
  onMacro,
  targetLabel,
  targetKind,
  onOpenTargetFilter,
  onClearTarget,
}: DiaryFilterBarProps): React.ReactElement {
  const { colors } = useTheme();
  const filteringByTarget = targetLabel !== null;

  if (filteringByTarget) {
    return (
      <View style={styles.targetRow}>
        <View style={styles.targetItemCentered}>
          {targetKind === "idea" ? (
            <SketchIcon type="idea" size={22} />
          ) : (
            <IconSymbol
              name="folder-outline"
              size={22}
              color={colors.inkMuted}
            />
          )}
          <View style={styles.targetTextWrap}>
            <ThemedText
              numberOfLines={1}
              style={[styles.targetLabel, { color: colors.ink }]}
            >
              {targetLabel}
            </ThemedText>
            <View style={[styles.rule, { backgroundColor: colors.ink }]} />
          </View>
          <Pressable
            onPress={onClearTarget}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Clear filter: ${targetLabel}`}
            style={styles.clearKey}
          >
            <IconSymbol name="close" size={18} color={colors.inkMuted} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.macros}>
        {MACROS.map((m) => {
          const active = macro === m.value;
          return (
            <Pressable
              key={m.value}
              onPress={() => onMacro(m.value)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Show ${m.label.toLowerCase()} notes`}
              style={styles.macroItem}
            >
              <ThemedText
                style={[
                  styles.macroLabel,
                  { color: active ? colors.ink : colors.inkMuted },
                ]}
              >
                {m.label}
              </ThemedText>
              <View
                style={[
                  styles.rule,
                  { backgroundColor: active ? colors.ink : "transparent" },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={onOpenTargetFilter}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Filter by a specific project or idea"
        style={styles.filterKey}
      >
        <IconSymbol name="filter-variant" size={20} color={colors.inkMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: tokens.space.xs,
  },
  macros: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: tokens.space.lg,
  },
  macroItem: {
    alignItems: "flex-start",
    gap: 5,
  },
  macroLabel: {
    fontFamily: tokens.type.fontInter.semiBold,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  rule: {
    alignSelf: "stretch",
    height: 2,
    borderRadius: tokens.radius.pill,
  },
  targetRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: tokens.space.xs,
  },
  targetItemCentered: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    maxWidth: "100%",
  },
  filterKey: {
    marginLeft: "auto",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  clearKey: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  targetTextWrap: {
    flexShrink: 1,
    alignItems: "flex-start",
    gap: 5,
  },
  targetLabel: {
    fontFamily: tokens.type.fontInter.semiBold,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
});
