import { Pressable, StyleSheet, View } from "react-native";

import { SketchIcon } from "@/components/atoms/sketch-icon";
import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
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
  /** Title of the idea currently filtered to (overrides macro), or null. */
  ideaLabel: string | null;
  /** Open the idea-filter bottom sheet. */
  onOpenIdeaFilter: () => void;
  /** Clear the idea filter (back to the macro buckets). */
  onClearIdea: () => void;
}

/**
 * The diary's filter row — editorial, not a control panel. The macro views (All /
 * Linked / Free) read as a line of section labels; the active one is full-ink and
 * carries a thin underline rule, the rest sit muted with no rule. No pills, no
 * fills. To the right, the idea filter: a minimal filter glyph that opens the
 * sheet, or — when active — the idea's name underlined (amber) with a small
 * clear. Macro and idea are mutually exclusive views.
 */
export function DiaryFilterBar({
  macro,
  onMacro,
  ideaLabel,
  onOpenIdeaFilter,
  onClearIdea,
}: DiaryFilterBarProps): React.ReactElement {
  const { colors } = useTheme();
  const idea = colors.type.ideas;
  const filteringByIdea = ideaLabel !== null;

  // When an idea filter is active, the macro line steps aside entirely — the idea
  // is the view now, so it stands centered and readable with a clear, nothing
  // else competing for the row.
  if (filteringByIdea) {
    return (
      <View style={styles.ideaRow}>
        <View style={styles.ideaItemCentered}>
          <SketchIcon type="idea" size={22} />
          <View style={styles.ideaTextWrap}>
            <ThemedText
              numberOfLines={1}
              style={[styles.ideaLabel, { color: colors.ink }]}
            >
              {ideaLabel}
            </ThemedText>
            <View style={[styles.rule, { backgroundColor: idea }]} />
          </View>
          <Pressable
            onPress={onClearIdea}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Clear idea filter: ${ideaLabel}`}
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
      {/* Macro views — a line of labels. Active = ink + underline. */}
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

      {/* Idea filter — a minimal filter glyph that opens the sheet. */}
      <Pressable
        onPress={onOpenIdeaFilter}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Filter by a specific idea"
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
  // The shared state rule — a thin underline that carries "active" for both the
  // macro labels and the idea name. Width tracks the label above it.
  rule: {
    alignSelf: "stretch",
    height: 2,
    borderRadius: tokens.radius.pill,
  },
  // Active idea filter takes the whole row, centered — the idea is the view.
  ideaRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: tokens.space.xs,
  },
  ideaItemCentered: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    maxWidth: "100%",
  },
  // Inactive idea filter — just the glyph, right-aligned, no fill.
  filterKey: {
    marginLeft: "auto",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  // Clear the active idea filter — a real close target (28pt + hitSlop → 44pt).
  clearKey: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  ideaTextWrap: {
    flexShrink: 1,
    alignItems: "flex-start",
    gap: 5,
  },
  ideaLabel: {
    fontFamily: tokens.type.fontInter.semiBold,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
});
