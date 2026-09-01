import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";

import type { DbProject } from "@/lib/types";

/**
 * A card on the Project Shelf's grid view — the second reading of the same
 * data `ProjectRow` shows. Where the row is instrument-panel (title + signal
 * left-to-right), the card is a glance tile: emoji as the hero, title beneath,
 * the sort signal as a mono footer, and the feature star pinned to the
 * top-right corner.
 *
 * The verb set is identical to `ProjectRow` — tap the body to open (bumps
 * last_opened_at), tap the star to feature. The one thing the grid drops is
 * swipe-to-delete: a half-width card is too small to swipe safely, so delete
 * stays on the list view and the project detail. The parent chooses which
 * component to render; this one is dumb about the shelf's mode.
 */
export function ProjectGridCard({
  project,
  signal,
  onToggleFeatured,
}: {
  project: DbProject;
  /** Pre-formatted signal line beneath the title. Empty string → hidden. */
  signal: string;
  /** Tapping the star calls this. The parent owns the call so it can chain
   *  haptics, persistence, and any optimistic UI in one place. */
  onToggleFeatured: () => void;
}): React.ReactElement {
  const { colors } = useTheme();
  const router = useRouter();
  const { touchProject } = useDatabase();

  const isFeatured = project.is_featured === 1;

  const open = (): void => {
    void touchProject(project.id);
    router.push({
      pathname: "/(tabs)/(projects)/project",
      params: { id: project.id },
    });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`Open ${project.title}`}
        style={styles.body}
      >
        {project.emoji ? (
          <ThemedText type="display" style={styles.emoji}>
            {project.emoji}
          </ThemedText>
        ) : (
          <View style={[styles.emojiFallback]}>
            <IconSymbol name="Folder2" size={22} color={colors.inkMuted} />
          </View>
        )}
        <ThemedText
          type="item"
          numberOfLines={1}
          style={[styles.title, { color: colors.ink }]}
        >
          {project.title}
        </ThemedText>
        {signal.length > 0 ? (
          <ThemedText
            type="mono"
            style={[styles.signal, { color: colors.inkMuted }]}
          >
            {signal}
          </ThemedText>
        ) : null}
      </Pressable>

      <Pressable
        onPress={onToggleFeatured}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={
          isFeatured
            ? `Unfeature ${project.title} from home`
            : `Feature ${project.title} on home`
        }
        accessibilityState={{ selected: isFeatured }}
        style={styles.starButton}
      >
        <IconSymbol
          name={isFeatured ? "Lock" : "Unlock"}
          size={16}
          color={isFeatured ? colors.feedback.success : colors.inkMuted}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.md,
    overflow: "hidden",
    flexGrow: 1,
  },
  body: {
    alignItems: "center",
    gap: tokens.space.xs,
    padding: tokens.space.md,
    paddingTop: tokens.space.xl,
    paddingBottom: tokens.space.sm,
  },
  emoji: {
    // Hero glyph. Rendered at display step so the emoji reads at a glance
    // before the title; no extra color needed.
  },
  emojiFallback: {
    borderRadius: tokens.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
    marginTop: tokens.space.xs,
    fontSize: 14,
  },
  signal: {
    textAlign: "center",
    fontSize: 12,
  },
  starButton: {
    position: "absolute",
    top: tokens.space.sm,
    right: tokens.space.sm,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "12deg" }], // a little tilt for the pin icon, like a thumbtack
  },
});
