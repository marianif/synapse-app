import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { entryColor, tokens, useTheme } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";

import type { DbProject } from "@/lib/types";

/**
 * A row on the Project Shelf. Two affordances live here and nowhere else:
 *
 *   • Tap the row body → open the project. Bumps last_opened_at so the
 *     RECENT sort reflects the visit. The project owns rename/emoji/archive
 *     on its own detail; this row is a navigator, not a tool drawer.
 *
 *   • Tap the star → toggle `is_featured`. The home overview reads only
 *     featured projects, so this is the one knob that decides what stays
 *     on the glance surface.
 *
 * The signal line beneath the title varies by sort mode so the sort feels
 * alive (recent → "3d ago", busy → "4 open · 1 deadline", a-z → just the
 * open count). The parent passes the signal already formatted — this row
 * is dumb about sort modes.
 *
 * Visual grammar: 3pt cyan edge-bar (a project is where todos live, and
 * todos are cyan in the type palette — Project ≈ Todo-container is the
 * brand-consistent read). Featured star is amber-filled (idea code: "this
 * one is alive on my home") or hollow ink-muted (everything else).
 */
export function ProjectRow({
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
    router.push({ pathname: "/project", params: { id: project.id } });
  };

  return (
    <View style={[styles.row, { backgroundColor: colors.surface }]}>
      <View style={[styles.edgeBar, { backgroundColor: entryColor("todo") }]} />

      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`Open ${project.title}`}
        style={styles.body}
      >
        <View style={styles.titleRow}>
          {project.emoji ? (
            <ThemedText type="item" style={styles.emoji}>
              {project.emoji}
            </ThemedText>
          ) : null}
          <ThemedText
            type="item"
            numberOfLines={1}
            style={[styles.title, { color: colors.ink }]}
          >
            {project.title}
          </ThemedText>
        </View>
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
          name={isFeatured ? "star" : "star-outline"}
          size={22}
          color={isFeatured ? entryColor("idea") : colors.inkMuted}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: tokens.radius.md,
    overflow: "hidden",
  },
  edgeBar: { width: 3, alignSelf: "stretch" },
  body: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  emoji: {
    // Emoji glyph sits flush with the title; no extra color needed.
  },
  title: {
    flex: 1,
  },
  signal: {
    // Mono signal line — instrument-panel feel under the title.
  },
  starButton: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space.sm,
  },
});
