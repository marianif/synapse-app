import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import {
  ProjectCard,
  type ProjectRollup,
} from "@/components/molecules/project-card";
import { SectionHeader } from "@/components/molecules/section-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { byRunway } from "@/lib/direct-when";

import type { DbEntry, DbProject } from "@/lib/types";

/**
 * Projects overview — the macro life areas, present at a glance with a live
 * open-item count. The home cut shows at most MAX_VISIBLE projects; the rest
 * live behind the section header's see-more link to /projects. Each card
 * opens the project (which already owns rename, emoji, archive and every
 * other secondary action) — no separate sheet competes with the tap.
 *
 * The grid is a true masonry — two independent vertical columns — so
 * expanding a card on one side never strands its row-mate with dead
 * whitespace; the next card in that column simply flows up. An "Add project"
 * tile lives in the shorter column so creation stays reachable from the
 * glance surface. On a zero-project home, the section shows a single
 * invitation tile rather than vanishing — PRODUCT.md principle 2 is "show
 * projects first", even when there are none yet.
 */

// GRID card readouts cap: how many named lines a card preview shows.
const PREVIEW_MAX = 3;

// Home only ever surfaces this many projects; everything past it lives behind
// the section header's see-more link to /projects.
const MAX_VISIBLE = 8;

export function ProjectsOverview({
  projects,
  entries,
  onAddProject,
}: {
  projects: DbProject[];
  entries: DbEntry[];
  /**
   * Summoned by the trailing add-tile and the zero-state tile. Home wires
   * this to the manual bar so creating from here uses the same path as the
   * tab-bar pen key's TAP register — one project-creation flow, not two.
   */
  onAddProject: () => void;
}): React.ReactElement {
  const { colors } = useTheme();

  const visible = projects.slice(0, MAX_VISIBLE);

  // Every project rolls up into two complementary views: a typed numeric
  // summary and a named, most-pressing-first preview slice. Both read off the
  // same filtered slice of `entries`; the card picks which to show.
  const projectRollup = (projectId: string): ProjectRollup => {
    const open = entries.filter(
      (e) =>
        e.project_id === projectId &&
        e.status !== "completed" &&
        e.status !== "met",
    );
    const counts = { deadline: 0, todo: 0, idea: 0 };
    for (const e of open) {
      if (e.type === "deadline") counts.deadline += 1;
      else if (e.type === "todo") counts.todo += 1;
      else if (e.type === "idea") counts.idea += 1;
    }
    const items = [...open].sort(byRunway).slice(0, PREVIEW_MAX);
    return { items, total: open.length, counts };
  };

  // Masonry split: alternate projects into two independent columns so each
  // column packs vertically on its own. A flex-wrap grid would force both
  // cards in a row-pair to the tallest sibling's height, so expanding one
  // card stranded its row-mate with dead whitespace instead of letting the
  // next card flow up. Independent columns fix that.
  const leftColumn = visible.filter((_, i) => i % 2 === 0);
  const rightColumn = visible.filter((_, i) => i % 2 === 1);
  // Drop the add-tile into the shorter column so the grid stays balanced.
  // Suppress at the cap — further creation belongs on /projects.
  const showAddTile = visible.length < MAX_VISIBLE;
  const addTileSide: "left" | "right" =
    rightColumn.length < leftColumn.length ? "right" : "left";

  if (projects.length === 0) {
    // First-run home. Returning null hid the entire concept of projects
    // until the user stumbled into /projects. One invitation tile preserves
    // PRODUCT.md principle 2 without competing with the tab-bar pen.
    return (
      <View style={styles.section}>
        <SectionHeader title="PROJECTS" />
        <Pressable
          onPress={onAddProject}
          accessibilityRole="button"
          accessibilityLabel="Name your first project"
          style={({ pressed }) => [
            styles.firstRunTile,
            { backgroundColor: colors.surface },
            pressed && styles.pressed,
          ]}
        >
          <IconSymbol name="plus" size={20} color={colors.ink} />
          <View style={styles.firstRunCopy}>
            <ThemedText
              type="body"
              style={[styles.firstRunTitle, { color: colors.ink }]}
            >
              Name a project
            </ThemedText>
            <ThemedText
              type="hand"
              style={[styles.firstRunHint, { color: colors.inkMuted }]}
            >
              your first life area
            </ThemedText>
          </View>
        </Pressable>
      </View>
    );
  }

  // Count line on the section header doubles as the see-more affordance:
  // "8 projects ›" — the count is the link. When the home cut isn't
  // truncating anything, the link is still useful as a way into /projects
  // for rename / archive / reorder, which the home grid doesn't expose.
  const projectsLabel = `${projects.length} ${projects.length === 1 ? "project" : "projects"}`;

  return (
    <View style={styles.section}>
      <SectionHeader
        title="PROJECTS"
        seeMoreHref="/projects"
        seeMoreText={projectsLabel}
        seeMoreA11yLabel="See all projects"
      />
      <View style={styles.grid}>
        <View style={styles.gridColumn}>
          {leftColumn.map((p) => (
            <ProjectCard key={p.id} project={p} rollup={projectRollup(p.id)} />
          ))}
          {showAddTile && addTileSide === "left" ? (
            <Pressable
              onPress={onAddProject}
              accessibilityRole="button"
              accessibilityLabel="New project"
              style={({ pressed }) => [
                styles.addTile,
                { backgroundColor: colors.surfaceSubtle },
                pressed && styles.pressed,
              ]}
            >
              <IconSymbol name="plus" size={22} color={colors.inkMuted} />
              <ThemedText type="body" style={{ color: colors.inkMuted }}>
                New project
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.gridColumn}>
          {rightColumn.map((p) => (
            <ProjectCard key={p.id} project={p} rollup={projectRollup(p.id)} />
          ))}
          {showAddTile && addTileSide === "right" ? (
            <Pressable
              onPress={onAddProject}
              accessibilityRole="button"
              accessibilityLabel="New project"
              style={({ pressed }) => [
                styles.addTile,
                { backgroundColor: colors.surfaceSubtle },
                pressed && styles.pressed,
              ]}
            >
              <IconSymbol name="plus" size={22} color={colors.inkMuted} />
              <ThemedText type="body" style={{ color: colors.inkMuted }}>
                New project
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: tokens.space.sm,
  },
  // Masonry: two independent vertical columns side-by-side. Each column packs
  // its cards top-down, so a tall card on the left no longer stretches its
  // right-hand neighbor — the next card just flows up.
  grid: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.space.sm,
  },
  gridColumn: {
    flex: 1,
    gap: tokens.space.sm,
  },
  // Grid add-tile: fills its column slot end-to-end since columns own width.
  addTile: {
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.xs,
    padding: tokens.space.md,
  },
  // Zero-state tile: full-width row that introduces the project concept
  // without competing with the tab-bar pen for tier-1 weight.
  firstRunTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    minHeight: 64,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    borderRadius: tokens.radius.md,
  },
  firstRunCopy: {
    flex: 1,
  },
  firstRunTitle: {
    fontFamily: tokens.type.fontInter.semiBold,
  },
  firstRunHint: {
    fontSize: 18,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.7,
  },
});
