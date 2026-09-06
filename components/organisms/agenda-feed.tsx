import { ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";

import { AgendaPromptCard } from "@/components/molecules/agenda-prompt-card";
import { EmptyState } from "@/components/molecules/empty-state";
import { tokens, useTheme } from "@/constants/theme";
import type { AgendaPrompt } from "@/lib/agenda-prompts";

/**
 * The Agenda is not a feed. It is a small set of invitations: one primary way
 * in, then at most two alternatives. Each card has one action and opens the
 * thing it names.
 *
 * The list stays intentionally shallow. More options would turn activation
 * back into another board to process.
 */

interface AgendaFeedProps {
  prompts: AgendaPrompt[];
  onSelect: (prompt: AgendaPrompt) => void;
  /** Rendered above the primary invitation. */
  header?: React.ReactElement;
  /** Clears the tab bar and the resting capture dock. */
  bottomInset: number;
}

/** Entrance stagger, capped so the last line never feels late. */
const STAGGER_MS = 45;
const STAGGER_CAP = 8;

export function AgendaFeed({
  prompts,
  onSelect,
  header,
  bottomInset,
}: AgendaFeedProps): React.ReactElement {
  const reduced = useReducedMotion();
  const { colors } = useTheme();
  const primary = prompts[0];
  const secondary = prompts.slice(1);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: bottomInset + tokens.space.xxxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {header}

      {primary ? (
        <Animated.View
          entering={
            reduced
              ? undefined
              : FadeInDown.duration(tokens.motion.duration.base).easing(
                  Easing.bezier(...tokens.motion.bezier),
                )
          }
        >
          <AgendaPromptCard prompt={primary} featured onPress={onSelect} />
        </Animated.View>
      ) : (
        <EmptyState
          title="Nothing needs a nudge right now."
          description="Capture a thought when one arrives, or leave the board alone for a while."
          accentColor={colors.inkMuted}
        />
      )}

      {secondary.length > 0 ? (
        <View style={styles.secondarySection}>
          <Animated.Text
            entering={
              reduced
                ? undefined
                : FadeInDown.delay(STAGGER_MS)
                    .duration(tokens.motion.duration.base)
                    .easing(Easing.bezier(...tokens.motion.bezier))
            }
            style={[styles.secondaryLabel, { color: colors.inkMuted }]}
          >
            Other ways in
          </Animated.Text>
          {secondary.map((prompt, index) => (
            <Animated.View
              key={prompt.id}
              entering={
                reduced
                  ? undefined
                  : FadeInDown.delay(
                      Math.min(index + 2, STAGGER_CAP) * STAGGER_MS,
                    )
                      .duration(tokens.motion.duration.base)
                      .easing(Easing.bezier(...tokens.motion.bezier))
              }
            >
              <AgendaPromptCard prompt={prompt} onPress={onSelect} />
              {index < secondary.length - 1 ? (
                <View style={styles.separator} />
              ) : null}
            </Animated.View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: tokens.space.lg,
  },
  secondarySection: {
    marginTop: tokens.space.xxxl,
  },
  secondaryLabel: {
    fontFamily: tokens.type.fontMono.medium,
    fontSize: tokens.type.kicker.size,
    lineHeight: tokens.type.kicker.lineHeight,
    letterSpacing: tokens.type.kicker.tracking,
    marginBottom: tokens.space.md,
    textTransform: "uppercase",
  },
  separator: {
    height: tokens.space.sm,
  },
});
