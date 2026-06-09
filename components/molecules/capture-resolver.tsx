import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useReducedMotion,
} from "react-native-reanimated";

import { SketchIcon } from "@/components/atoms/sketch-icon";
import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LinkableIdea } from "@/components/organisms/link-sheet";
import { tokens, useTheme } from "@/constants/theme";

// A recent idea the captured thought can be filed under — same shape the link
// sheet uses, re-exported so call-sites can import it from either place.
export type { LinkableIdea };

export type CaptureResolution =
  | { kind: "idea" }
  | { kind: "note" }
  | { kind: "note-on"; entryId: string };

interface CaptureResolverProps {
  /** The thought just captured — echoed so the user knows what they're filing. */
  text: string;
  /** Recent ideas offered under "Note on…". Empty hides that affordance. */
  ideas: LinkableIdea[];
  /** Whether the "Note on…" idea picker is expanded. */
  picking: boolean;
  onTogglePicking: () => void;
  /** Commit a destination. */
  onResolve: (resolution: CaptureResolution) => void;
  /** Discard the pending thought without filing it. */
  onDismiss: () => void;
}

/**
 * The post-capture destination chooser. The capture bar files nothing on its
 * own anymore — it hands the thought here, and this slim row lets the writer
 * file it as an idea, an autonomous diary note, or a note ON a recent idea. It
 * stays until the writer picks (no auto-commit) — the thought is held safely in
 * the meantime, and a new capture replaces it. It wears the amber capture
 * identity on its left edge.
 */
export function CaptureResolver({
  text,
  ideas,
  picking,
  onTogglePicking,
  onResolve,
  onDismiss,
}: CaptureResolverProps): React.ReactElement {
  const { colors } = useTheme();
  const reduced = useReducedMotion();

  return (
    <Animated.View
      entering={reduced ? undefined : FadeIn.duration(160)}
      exiting={reduced ? undefined : FadeOut.duration(120)}
      style={[styles.card, { backgroundColor: colors.surface }]}
    >
      <View style={[styles.edge, { backgroundColor: colors.type.ideas }]} />

      <View style={styles.body}>
        <View style={styles.headRow}>
          <ThemedText type="micro" style={{ color: colors.inkMuted }}>
            FILE AS
          </ThemedText>
          <ThemedText
            type="body"
            numberOfLines={1}
            style={[styles.echo, { color: colors.inkMuted }]}
          >
            {text}
          </ThemedText>
          <Pressable
            onPress={onDismiss}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Discard this thought"
            style={styles.dismiss}
          >
            <IconSymbol name="close" size={16} color={colors.inkMuted} />
          </Pressable>
        </View>

        {picking ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.pickerRow}
          >
            <Pressable
              onPress={onTogglePicking}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back to destinations"
              style={[styles.chip, { backgroundColor: colors.surfaceSubtle }]}
            >
              <ThemedText type="micro" style={{ color: colors.inkMuted }}>
                ‹ BACK
              </ThemedText>
            </Pressable>
            {ideas.map((idea) => (
              <Pressable
                key={idea.id}
                onPress={() => onResolve({ kind: "note-on", entryId: idea.id })}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Note on idea: ${idea.title}`}
                style={[styles.chip, { backgroundColor: colors.surfaceSubtle }]}
              >
                <SketchIcon type="idea" size={14} />
                <ThemedText
                  type="body"
                  numberOfLines={1}
                  style={[styles.chipIdeaLabel, { color: colors.ink }]}
                >
                  {idea.title}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => onResolve({ kind: "idea" })}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="File as idea"
              style={[styles.chip, { backgroundColor: colors.type.ideas + "24" }]}
            >
              <SketchIcon type="idea" size={15} />
              <ThemedText type="micro" style={{ color: colors.ink }}>
                IDEA
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => onResolve({ kind: "note" })}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="File as diary note"
              style={[styles.chip, { backgroundColor: colors.surfaceSubtle }]}
            >
              <ThemedText type="micro" style={{ color: colors.inkMuted }}>
                NOTE
              </ThemedText>
            </Pressable>

            {ideas.length > 0 ? (
              <Pressable
                onPress={onTogglePicking}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="File as note on an idea"
                style={[styles.chip, { backgroundColor: colors.surfaceSubtle }]}
              >
                <ThemedText type="micro" style={{ color: colors.inkMuted }}>
                  NOTE ON…
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: tokens.radius.md,
    overflow: "hidden",
    marginBottom: tokens.space.sm,
  },
  edge: {
    width: 4,
  },
  body: {
    flex: 1,
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.sm,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  echo: {
    flex: 1,
  },
  dismiss: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingRight: tokens.space.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    minHeight: 32,
    maxWidth: 200,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.pill,
  },
  chipIdeaLabel: {
    flexShrink: 1,
    fontFamily: tokens.type.fontHand.medium,
    fontSize: 18,
    lineHeight: 22,
  },
});
