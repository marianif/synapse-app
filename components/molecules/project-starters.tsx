import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { EntryDot } from "@/components/atoms/entry-dot";
import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";
import { starterPromptsFor, type StarterPrompt } from "@/lib/project-starters";

import type { EntryType } from "@/lib/types";

/**
 * The empty-project canvas as an instrument panel at rest, not a void. Renders
 * one add-row per channel (todo · idea · deadline) so a fresh project reads as
 * three lit-but-empty lanes waiting to be filled — the useful default, the
 * projects-overview philosophy applied inside a single project.
 *
 * ONE component for both cases; the difference is only the prompt copy:
 *   - seeded default project → topic-suited lines ("Book a workout"), tapping
 *     pre-fills the composer (a real head-start).
 *   - user-created project    → generic labels ("First project todo"), tapping
 *     opens the composer blank.
 *
 * Rows are display-only affordances — a tap arms the SAME in-screen composer
 * the FAB opens (via onStart), pre-locked to this project and type. Nothing is
 * a real entry until the user commits.
 *
 * Per-type persistence: a prompt for type T shows until the project has at
 * least one real entry of type T. So each channel retires on its own — after
 * the user adds a todo, the todo prompt is gone but the idea and deadline
 * prompts stay, sitting below the now-real todo. When every channel has been
 * used the component renders nothing.
 */
export function ProjectStarters({
  projectTitle,
  presentTypes,
  onStart,
}: {
  projectTitle: string;
  /** Entry types the project already carries — prompts for these are retired. */
  presentTypes: Set<EntryType>;
  /**
   * Arm the project composer for `type`, seeding `text` when the prompt is a
   * real suggestion (empty string = open blank). Wired to the same setter the
   * FAB uses, so there's one composer, one add-path.
   */
  onStart: (prompt: StarterPrompt) => void;
}): React.ReactElement | null {
  const { colors } = useTheme();
  const prompts = starterPromptsFor(projectTitle).filter(
    (p) => !presentTypes.has(p.type),
  );

  if (prompts.length === 0) return null;

  return (
    <View style={styles.list}>
      {prompts.map((prompt) => (
        <Pressable
          key={prompt.type}
          onPress={() => onStart(prompt)}
          accessibilityRole="button"
          accessibilityLabel={`Add ${prompt.type}: ${prompt.text}`}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons
            name="plus"
            size={16}
            color={colors.inkMuted}
          />
          <EntryDot type={prompt.type} />
          <ThemedText
            type="body"
            numberOfLines={1}
            style={[styles.text, { color: colors.inkMuted }]}
          >
            {prompt.text}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: tokens.space.xs,
  },
  // Add-row: a + and the type dot lead a muted label. Explicitly an action, not
  // a fake entry — no surface fill, sits on the paper like the "add a note"
  // affordance so it never reads as a committed line.
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.xs,
  },
  text: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
