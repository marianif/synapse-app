import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { SketchIcon } from "@/components/atoms/sketch-icon";
import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

/** A recent idea the captured thought can be filed under. */
export interface LinkableIdea {
  id: string;
  title: string;
}

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
  /** Seconds until the row auto-commits to `idea` (the safe default). */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT = 6000;

/**
 * The post-capture destination chooser. The capture bar files nothing on its
 * own anymore — it hands the thought here, and this slim row lets the writer
 * file it as an idea (the action-board default), an autonomous diary note, or a
 * note ON a recent idea. Doing nothing commits an idea after `timeoutMs`, so the
 * frictionless path and old muscle memory survive: ↵ then ignore = idea, as
 * before. It wears the amber capture identity on its left edge.
 */
export function CaptureResolver({
  text,
  ideas,
  picking,
  onTogglePicking,
  onResolve,
  timeoutMs = DEFAULT_TIMEOUT,
}: CaptureResolverProps): React.ReactElement {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(1);

  // Auto-commit to `idea` when the window lapses — nothing is ever lost, and the
  // default matches the old behaviour. The countdown rail visualises the window.
  useEffect(() => {
    const timer = setTimeout(() => onResolve({ kind: "idea" }), timeoutMs);
    if (!reduced) {
      progress.value = withTiming(0, {
        duration: timeoutMs,
        easing: Easing.linear,
      });
    }
    return () => clearTimeout(timer);
    // Re-arm if the captured text changes (a new thought replaced this one).
  }, [text, timeoutMs, reduced, progress, onResolve]);

  const railStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

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
            KEPT · FILE AS
          </ThemedText>
          <ThemedText
            type="body"
            numberOfLines={1}
            style={[styles.echo, { color: colors.inkMuted }]}
          >
            {text}
          </ThemedText>
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

      {/* Countdown rail — the window before this commits to IDEA on its own. */}
      <Animated.View
        style={[
          styles.rail,
          { backgroundColor: colors.type.ideas },
          railStyle,
        ]}
      />
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
  rail: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    // scaleX animates from the left edge
    transformOrigin: "left",
  },
});
