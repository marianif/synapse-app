import { useMemo } from "react";
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
 * open-item count. The home surfaces only the projects the user has marked
 * `is_featured` on the Project Shelf (app/projects.tsx) — the home is the
 * map, the shelf is where you choose what to keep on it. Each card opens the
 * project; no separate sheet competes with the tap.
 *
 * The grid is a true masonry — two independent vertical columns — so
 * expanding a card on one side never strands its row-mate with dead
 * whitespace; the next card in that column simply flows up.
 *
 * Two states, honoring PRODUCT.md principle 2 (show projects first, and never
 * hide them behind a curation prompt — projects are too important):
 *   - No projects at all → first-run invitation tile (creation)
 *   - Projects exist → the grid. If the user has featured some, show those;
 *     otherwise default to showing all projects rather than an empty state.
 */

// GRID card readouts cap: how many named lines a card preview shows.
const PREVIEW_MAX = 3;

// Stable fallback for projects with no open entries, so lookups never allocate
// a fresh empty rollup per render.
const EMPTY_ROLLUP: ProjectRollup = {
  items: [],
  total: 0,
  counts: { deadline: 0, todo: 0, idea: 0 },
};

export function ProjectsOverview({
  projects,
  entries,
  onAddProject,
}: {
  projects: DbProject[];
  entries: DbEntry[];
  /**
   * Summoned by the first-run invitation tile. Home wires this to the manual
   * bar so creating from here uses the same path as the tab-bar pen key's
   * TAP register — one project-creation flow, not two.
   */
  onAddProject: () => void;
}): React.ReactElement {
  const { colors } = useTheme();

  // Projects are too important to ever hide behind a curation prompt. If the
  // user has explicitly featured some, honor that pick. But when none are
  // featured yet, we DON'T fall back to an empty/curation state — we surface
  // the existing projects as the default so the home always glows with them.
  const explicitlyFeatured = projects.filter((p) => p.is_featured === 1);
  const featured =
    explicitlyFeatured.length > 0 ? explicitlyFeatured : projects;

  // Every project rolls up into two complementary views: a typed numeric
  // summary and a named, most-pressing-first preview slice. Both read off the
  // same filtered slice of `entries`; the card picks which to show. One pass
  // over `entries` groups open items by project, so this is O(entries) per
  // render rather than O(entries × projects) — `entries` churns on every
  // capture, so per-project re-filtering was the hot path here.
  const rollups = useMemo(() => {
    const grouped = new Map<string, DbEntry[]>();
    for (const e of entries) {
      if (!e.project_id) continue;
      if (e.status === "completed" || e.status === "met") continue;
      const bucket = grouped.get(e.project_id);
      if (bucket) bucket.push(e);
      else grouped.set(e.project_id, [e]);
    }
    const result = new Map<string, ProjectRollup>();
    for (const [projectId, open] of grouped) {
      const counts = { deadline: 0, todo: 0, idea: 0 };
      for (const e of open) {
        if (e.type === "deadline") counts.deadline += 1;
        else if (e.type === "todo") counts.todo += 1;
        else if (e.type === "idea") counts.idea += 1;
      }
      const items = [...open].sort(byRunway).slice(0, PREVIEW_MAX);
      result.set(projectId, { items, total: open.length, counts });
    }
    return result;
  }, [entries]);

  // Masonry split: alternate projects into two independent columns so each
  // column packs vertically on its own. A flex-wrap grid would force both
  // cards in a row-pair to the tallest sibling's height, so expanding one
  // card stranded its row-mate with dead whitespace instead of letting the
  // next card flow up. Independent columns fix that.
  const leftColumn = featured.filter((_, i) => i % 2 === 0);
  const rightColumn = featured.filter((_, i) => i % 2 === 1);
  // The add-tile keeps creation reachable from the glance surface (the home
  // is principle 2's first stop). Drop it into the shorter column so the
  // grid stays balanced and an odd featured count never strands whitespace.
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

  return (
    <View style={styles.section}>
      <SectionHeader title="Projects and Life Areas" />
      <View style={styles.grid}>
        <View style={styles.gridColumn}>
          {leftColumn.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              rollup={rollups.get(p.id) ?? EMPTY_ROLLUP}
            />
          ))}
          {addTileSide === "left" ? (
            <AddProjectTile onPress={onAddProject} />
          ) : null}
        </View>
        <View style={styles.gridColumn}>
          {rightColumn.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              rollup={rollups.get(p.id) ?? EMPTY_ROLLUP}
            />
          ))}
          {addTileSide === "right" ? (
            <AddProjectTile onPress={onAddProject} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function AddProjectTile({
  onPress,
}: {
  onPress: () => void;
}): React.ReactElement {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
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
    minHeight: 72,
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
