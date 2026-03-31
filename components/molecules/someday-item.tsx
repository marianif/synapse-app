import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { EntryDot } from "@/components/atoms/entry-dot";
import { ThemedText } from "@/components/atoms/themed-text";
import { ThemedView } from "@/components/atoms/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { EntryAccent, Radius, Spacing, Surface, TextColors } from "@/constants/theme";

import type { DbIdea } from "@/lib/schema";

interface SomedayItemProps {
  ideas: DbIdea[];
}

/**
 * Someday ideas stack molecule.
 * Renders a compact stack of idea cards showing:
 * - Header with sparkle icon and "IDEAS" count badge
 * - Stacked list of ideas with title, subtitle, and inspiration preview
 * - Tap anywhere to navigate to the full someday list
 */
export function SomedayItem({ ideas }: SomedayItemProps): React.ReactElement {
  const router = useRouter();
  const displayIdeas = ideas.slice(0, 3);
  const remainingCount = ideas.length - displayIdeas.length;

  return (
    <Pressable
      onPress={() => router.push('/list?entryType=someday')}
      accessibilityRole="button"
      accessibilityLabel={`Open someday ideas list, ${ideas.length} ideas`}
    >
      <ThemedView surface="container" style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <IconSymbol
              name="star-four-points"
              size={18}
              color={EntryAccent.someday}
            />
            <ThemedText
              type="label"
              style={[styles.label, { color: EntryAccent.someday }]}
            >
              SOMEDAY
            </ThemedText>
          </View>
          <View style={styles.countBadge}>
            <ThemedText type="caption" style={styles.countText}>
              {ideas.length}
            </ThemedText>
          </View>
        </View>

        {/* Ideas stack */}
        <View style={styles.stack}>
          {displayIdeas.map((idea, index) => (
            <View
              key={idea.id}
              style={[
                styles.ideaRow,
                index !== displayIdeas.length - 1 && styles.ideaRowBorder,
              ]}
            >
              <View style={styles.ideaContent}>
                <View style={styles.ideaTitleRow}>
                  <EntryDot type="someday" size={6} />
                  <ThemedText type="bodyBold" numberOfLines={1} style={styles.ideaTitle}>
                    {idea.title}
                  </ThemedText>
                </View>
                {idea.subtitle && (
                  <ThemedText type="caption" muted numberOfLines={1} style={styles.ideaSubtitle}>
                    {idea.subtitle}
                  </ThemedText>
                )}
                {idea.inspiration && (
                  <ThemedText type="caption" numberOfLines={1} style={styles.ideaInspiration}>
                    &ldquo;{idea.inspiration}&rdquo;
                  </ThemedText>
                )}
              </View>
            </View>
          ))}
          {remainingCount > 0 && (
            <View style={styles.moreRow}>
              <ThemedText type="caption" muted>
                +{remainingCount} more
              </ThemedText>
            </View>
          )}
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  label: {
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: Surface.containerHigh,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  countText: {
    color: TextColors.secondary,
    fontFamily: "Inter_600SemiBold",
  },
  stack: {
    gap: 0,
  },
  ideaRow: {
    paddingVertical: Spacing.sm,
  },
  ideaRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Surface.containerLowest,
  },
  ideaContent: {
    gap: 2,
  },
  ideaTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  ideaTitle: {
    flex: 1,
    color: TextColors.primary,
  },
  ideaSubtitle: {
    paddingLeft: 14,
  },
  ideaInspiration: {
    paddingLeft: 14,
    fontStyle: "italic",
    color: TextColors.tertiary,
  },
  moreRow: {
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
});
