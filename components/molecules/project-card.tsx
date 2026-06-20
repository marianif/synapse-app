import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { EntryDot } from "@/components/atoms/entry-dot";
import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { useUiPreference } from "@/hooks/use-ui-preference";

import type { DbEntry, DbProject, EntryType } from "@/lib/types";

type ProjectCardMode = "numeric" | "preview";

function isCardMode(value: string | null): value is ProjectCardMode {
  return value === "numeric" || value === "preview";
}

export type ProjectRollup = {
  items: DbEntry[];
  total: number;
  counts: { deadline: number; todo: number; idea: number };
};

/** Pluralized "N x" summary line: "2 ideas · 4 todos · 1 deadline". Empty
 *  buckets are dropped so the line stays terse; an all-zero rollup is handled
 *  by the caller as the "QUIET" empty state. */
function summaryLine(counts: {
  deadline: number;
  todo: number;
  idea: number;
}): string {
  const parts: string[] = [];
  if (counts.deadline)
    parts.push(
      `${counts.deadline} ${counts.deadline === 1 ? "deadline" : "deadlines"}`,
    );
  if (counts.todo)
    parts.push(`${counts.todo} ${counts.todo === 1 ? "todo" : "todos"}`);
  if (counts.idea)
    parts.push(`${counts.idea} ${counts.idea === 1 ? "idea" : "ideas"}`);
  return parts.join(" · ");
}

/**
 * A grid card with two interaction modes that depend on whether the project
 * has open items:
 *
 *   Quiet (total = 0): the whole card navigates straight to the project — no
 *                      preview to expand, so a tap has only one meaning.
 *
 *   Non-quiet:
 *     numeric (default): tapping anywhere expands to preview.
 *     preview          : the title row collapses back to numeric (a chevron
 *                        affords this); tapping the items area navigates to
 *                        the project detail.
 *
 * Mode is persisted per project via useUiPreference, so an expanded card stays
 * expanded across launches.
 */
export function ProjectCard({
  project,
  rollup,
}: {
  project: DbProject;
  rollup: ProjectRollup;
}): React.ReactElement {
  const { colors } = useTheme();
  const router = useRouter();
  const [mode, setMode] = useUiPreference<ProjectCardMode>(
    `projects.card.${project.id}`,
    "numeric",
    isCardMode,
  );
  const { items, total, counts } = rollup;
  const isQuiet = total === 0;
  const isExpanded = mode === "preview";

  const openProject = (): void => {
    router.push({ pathname: "/project", params: { id: project.id } });
  };
  const expand = (): void => setMode("preview");
  const collapse = (): void => setMode("numeric");

  // Header tap: quiet cards open the project; collapsed cards expand; expanded
  // cards collapse. Items area: only meaningful when expanded, opens project.
  const onHeaderPress = isQuiet
    ? openProject
    : isExpanded
      ? collapse
      : expand;
  const headerA11yHint = isQuiet
    ? "Opens project"
    : isExpanded
      ? "Collapses preview"
      : "Expands preview";
  const a11yBody = isQuiet
    ? `${project.title}, nothing on the line`
    : `${project.title}, ${summaryLine(counts)}`;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Pressable
        onPress={onHeaderPress}
        accessibilityRole="button"
        accessibilityLabel={a11yBody}
        accessibilityHint={headerA11yHint}
        style={({ pressed }) => [styles.cardHeader, pressed && styles.pressed]}
      >
        <View style={styles.cardHead}>
          <ThemedText
            type="body"
            style={[
              styles.cardGlyph,
              !project.emoji && { color: colors.inkMuted },
            ]}
          >
            {project.emoji ?? "·"}
          </ThemedText>
          <ThemedText
            type="body"
            numberOfLines={1}
            style={[styles.cardTitle, { color: colors.ink }]}
          >
            {project.title}
          </ThemedText>
          {/* Toggle affordance: a chevron on non-quiet cards signals the
              title row is a control. Down = "more to reveal" (collapsed);
              up = "tap to close" (expanded). Quiet cards drop it — the whole
              card is just a link, no toggle to signal. */}
          {!isQuiet ? (
            <IconSymbol
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.inkMuted}
            />
          ) : null}
        </View>

        {!isExpanded || isQuiet ? (
          <ThemedText
            type="hand"
            style={[styles.cardSummary, { color: colors.inkMuted }]}
          >
            {isQuiet ? "Quiet right now." : summaryLine(counts)}
          </ThemedText>
        ) : null}
      </Pressable>

      {isExpanded && !isQuiet ? (
        // Items area only exists when expanded. Tapping it navigates — the
        // collapse action lives in the title row's chevron above.
        <Pressable
          onPress={openProject}
          accessibilityRole="button"
          accessibilityLabel={`Open ${project.title}`}
          style={({ pressed }) => [styles.cardItems, pressed && styles.pressed]}
        >
          {items.map((e) => (
            <View key={e.id} style={styles.cardLine}>
              <EntryDot type={e.type as EntryType} />
              <ThemedText
                type="body"
                numberOfLines={1}
                style={[styles.cardLineTitle, { color: colors.ink }]}
              >
                {e.title}
              </ThemedText>
            </View>
          ))}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
    borderRadius: tokens.radius.md,
    overflow: "hidden",
  },
  cardHeader: {
    padding: tokens.space.md,
    paddingBottom: tokens.space.sm,
    gap: tokens.space.sm,
  },
  cardItems: {
    paddingHorizontal: tokens.space.md,
    paddingBottom: tokens.space.md,
    paddingTop: tokens.space.xs,
    gap: tokens.space.xs,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  cardGlyph: {
    fontSize: 22,
    lineHeight: 26,
  },
  cardTitle: {
    flex: 1,
  },
  cardLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  cardLineTitle: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },

  cardSummary: {
    lineHeight: 20,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.7,
  },
});
