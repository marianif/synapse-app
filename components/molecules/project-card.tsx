import { Pressable, StyleSheet, View } from "react-native";

import { EntryDot } from "@/components/atoms/entry-dot";
import { ThemedText } from "@/components/atoms/themed-text";
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
 * A grid card with two complementary readouts the user toggles between by
 * tapping the card body:
 *
 *   numeric (default): typed summary line — "2 ideas · 4 todos · 1 deadline".
 *                      Fast-glance instrument readout.
 *   preview          : named entity lines (dot + title), most-pressing-first.
 *                      The deeper read, sized like a miniature of the spine.
 *
 * Mode is persisted per project via useUiPreference, so flipping a card sticks
 * across launches. The footer becomes the call-to-action — "OPEN PROJECT →" —
 * and is the only element that navigates. Tapping the card body never opens
 * the project; it flips the readout. (Without this split, a tap is ambiguous.)
 */
export function ProjectCard({
  project,
  rollup,
}: {
  project: DbProject;
  rollup: ProjectRollup;
}): React.ReactElement {
  const { colors } = useTheme();
  const [mode, setMode] = useUiPreference<ProjectCardMode>(
    `projects.card.${project.id}`,
    "numeric",
    isCardMode,
  );
  const { items, total, counts } = rollup;
  const flip = (): void => setMode(mode === "numeric" ? "preview" : "numeric");

  // A11y label rolls the count up so screen-reader users get the summary
  // regardless of which view the card is currently showing.
  const a11yBody =
    total === 0
      ? `${project.title}, nothing on the line`
      : `${project.title}, ${summaryLine(counts)}`;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* The card body — tapping it flips the readout. Not a Link: navigation
          lives in the footer, so a tap on the body can never be misread as
          "open the project". */}
      <Pressable
        onPress={flip}
        accessibilityRole="button"
        accessibilityLabel={`${a11yBody}. Tap to switch view.`}
        style={({ pressed }) => [styles.cardBody, pressed && styles.pressed]}
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
            numberOfLines={2}
            style={[styles.cardTitle, { color: colors.ink }]}
          >
            {project.title}
          </ThemedText>
        </View>

        <View style={styles.cardLines}>
          {total === 0 ? (
            <ThemedText
              type="hand"
              style={[styles.cardSummary, { color: colors.inkMuted }]}
            >
              Quiet right now.
            </ThemedText>
          ) : mode === "numeric" ? (
            // Numeric: typed summary in body weight — fast scan, no clutter.
            <ThemedText
              type="hand"
              style={[styles.cardSummary, { color: colors.inkMuted }]}
            >
              {summaryLine(counts)}
            </ThemedText>
          ) : (
            // Preview: named lines, dialect of DirectRow so it reads as a
            // miniature of the spine inside the project.
            items.map((e) => (
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
            ))
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: "48%",
    flexGrow: 0,
    alignSelf: "flex-start",
    borderRadius: tokens.radius.md,
    overflow: "hidden",
  },
  cardBody: {
    flex: 0,
    padding: tokens.space.md,
    paddingBottom: tokens.space.sm,
    gap: tokens.space.sm,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.space.sm,
  },
  cardGlyph: {
    fontSize: 22,
    lineHeight: 26,
  },
  cardTitle: {
    flex: 1,
  },
  cardLines: {
    flex: 0,
    gap: tokens.space.xs,
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
