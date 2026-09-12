import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";

import { EntryDot } from "@/components/atoms/entry-dot";
import { ThemedText } from "@/components/atoms/themed-text";
import { AgendaPromptCard } from "@/components/molecules/agenda-prompt-card";
import { EmptyState } from "@/components/molecules/empty-state";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import type { AgendaPrompt, AgendaPromptKind } from "@/lib/agenda-prompts";
import type { DbEntry, EntryType } from "@/lib/types";

/**
 * The Agenda is a small editorial list: one place to start, then the rest of
 * the openings the board actually has, grouped by kind. It stays a curated
 * surface — it never narrates the raw database — but it no longer hides real
 * openings behind a three-item cap.
 *
 * Above it all sits NEXT UP: the entries the user themselves flagged as what
 * they're doing next. Those are not suggestions, so they lead the page and are
 * never dropped by ranking.
 */

interface AgendaFeedProps {
  prompts: AgendaPrompt[];
  /** Open entries the user flagged as next, most recently chosen first. */
  nextActions: DbEntry[];
  onSelect: (prompt: AgendaPrompt) => void;
  /** Opens a flagged next-action entry. */
  onSelectEntry: (id: string) => void;
  /** Rendered above everything. */
  header?: React.ReactElement;
  /** Clears the tab bar and the resting capture dock. */
  bottomInset: number;
}

/** Entrance stagger, capped so the last line never feels late. */
const STAGGER_MS = 45;
const STAGGER_CAP = 8;

const KIND_ORDER: AgendaPromptKind[] = [
  "return",
  "continue",
  "prepare",
  "decide",
];

const KIND_LABEL: Record<AgendaPromptKind, string> = {
  return: "Return to a thread",
  continue: "Continue",
  prepare: "Prepare",
  decide: "Decide",
};

export function AgendaFeed({
  prompts,
  nextActions,
  onSelect,
  onSelectEntry,
  header,
  bottomInset,
}: AgendaFeedProps): React.ReactElement {
  const reduced = useReducedMotion();
  const { colors } = useTheme();
  const primary = prompts[0];
  const rest = prompts.slice(1);

  // The rest, grouped by kind and kept in priority order inside each group.
  const groups = KIND_ORDER.map((kind) => ({
    kind,
    prompts: rest.filter((prompt) => prompt.kind === kind),
  })).filter((group) => group.prompts.length > 0);

  const nothing = prompts.length === 0 && nextActions.length === 0;

  const enter = (delayIndex: number) =>
    reduced
      ? undefined
      : FadeInDown.delay(Math.min(delayIndex, STAGGER_CAP) * STAGGER_MS)
          .duration(tokens.motion.duration.base)
          .easing(Easing.bezier(...tokens.motion.bezier));

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: bottomInset + tokens.space.xxxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {header}

      {nextActions.length > 0 ? (
        <Animated.View entering={enter(0)} style={styles.section}>
          <ThemedText
            type="micro"
            style={[styles.sectionLabel, { color: colors.inkMuted }]}
          >
            {`NEXT UP · ${nextActions.length}`}
          </ThemedText>
          {nextActions.map((entry) => (
            <Pressable
              key={entry.id}
              onPress={() => onSelectEntry(entry.id)}
              accessibilityRole="button"
              accessibilityLabel={`Next action: ${entry.title}`}
              style={({ pressed }) => [
                styles.nextRow,
                { backgroundColor: colors.surface },
                pressed && styles.pressed,
              ]}
            >
              <EntryDot type={entry.type as EntryType} />
              <ThemedText
                type="body"
                numberOfLines={1}
                style={[styles.nextTitle, { color: colors.ink }]}
              >
                {entry.title}
              </ThemedText>
              <IconSymbol
                name="ArrowRight"
                size={16}
                color={colors.inkMuted}
              />
            </Pressable>
          ))}
        </Animated.View>
      ) : null}

      {primary ? (
        <Animated.View entering={enter(nextActions.length > 0 ? 1 : 0)}>
          <ThemedText
            type="micro"
            style={[styles.sectionLabel, { color: colors.inkMuted }]}
          >
            Start here
          </ThemedText>
          <AgendaPromptCard
            prompt={primary}
            index={0}
            featured
            onPress={onSelect}
          />
        </Animated.View>
      ) : nothing ? (
        <EmptyState
          title="Nothing needs a nudge right now."
          description="Capture a thought when one arrives, or leave the board alone for a while."
          accentColor={colors.inkMuted}
        />
      ) : null}

      {groups.map((group, groupIndex) => (
        <View key={group.kind} style={styles.group}>
          <Animated.Text
            entering={enter(groupIndex + 1)}
            style={[styles.sectionLabel, { color: colors.inkMuted }]}
          >
            {KIND_LABEL[group.kind]}
          </Animated.Text>
          {group.prompts.map((prompt, index) => (
            <Animated.View
              key={prompt.id}
              entering={enter(groupIndex + index + 2)}
            >
              <AgendaPromptCard prompt={prompt} index={index} onPress={onSelect} />
              {index < group.prompts.length - 1 ? (
                <View style={styles.separator} />
              ) : null}
            </Animated.View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: tokens.space.lg,
  },
  section: {
    marginBottom: tokens.space.xl,
    gap: tokens.space.sm,
  },
  group: {
    marginTop: tokens.space.xl,
  },
  sectionLabel: {
    fontFamily: tokens.type.fontMono.medium,
    fontSize: tokens.type.kicker.size,
    lineHeight: tokens.type.kicker.lineHeight,
    letterSpacing: tokens.type.kicker.tracking,
    marginBottom: tokens.space.sm,
    textTransform: "uppercase",
  },
  // NEXT UP row — a chosen entry, quieter chrome than an invitation card. Same
  // type dot as the board so identity is constant; one tap opens the entry.
  nextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    minHeight: 48,
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.md,
  },
  nextTitle: {
    flex: 1,
  },
  separator: {
    height: tokens.space.xs,
  },
  pressed: {
    opacity: 0.7,
  },
});
