import { Link } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import {
  ProjectCard,
  type ProjectRollup,
} from "@/components/molecules/project-card";
import { SectionHeader } from "@/components/molecules/section-header";
import {
  SectionLayoutMenu,
  type SectionLayoutOption,
} from "@/components/molecules/section-layout-menu";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { useUiPreference } from "@/hooks/use-ui-preference";
import { byRunway } from "@/lib/direct-when";

import type { DbEntry, DbProject } from "@/lib/types";

/**
 * Projects overview — the macro life areas, present at a glance with a live
 * open-item count. The home cut shows at most MAX_VISIBLE projects; the rest
 * live behind the section header's "see more →" link to /projects. Each row
 * or card opens the project (which already owns rename, emoji, archive and
 * every other secondary action) — no separate sheet competes with the tap.
 *
 * In grid mode, the trailing empty cell becomes an "Add project" tile so
 * creation is reachable from the glance surface instead of requiring a trip
 * to /projects. On a zero-project home, the section shows a single invitation
 * tile rather than vanishing — PRODUCT.md principle 2 is "show projects
 * first", even when there are none yet.
 */
type ProjectsLayout = "list" | "grid";

function isProjectsLayout(value: string | null): value is ProjectsLayout {
  return value === "list" || value === "grid";
}

const PROJECTS_LAYOUT_OPTIONS: SectionLayoutOption<ProjectsLayout>[] = [
  { key: "list", label: "List", icon: "view-list" },
  { key: "grid", label: "Grid", icon: "view-grid" },
];

// GRID card readouts cap: how many named lines a card preview shows.
const PREVIEW_MAX = 3;

// Home only ever surfaces this many projects; everything past it lives behind
// the section header's "see more →" link to /projects.
const MAX_VISIBLE = 8;

export function ProjectsOverview({
  projects,
  entries,
  onAddProject,
}: {
  projects: DbProject[];
  entries: DbEntry[];
  /**
   * Summoned by the trailing empty-cell tile (grid), the list-mode terminator
   * row, and the zero-state tile. Home wires this to the manual bar so
   * creating from here uses the same path as the tab-bar pen key's TAP
   * register — one project-creation flow, not two.
   */
  onAddProject: () => void;
}): React.ReactElement {
  const { colors } = useTheme();
  const [layout, setLayout] = useUiPreference<ProjectsLayout>(
    "section.layout.projects",
    "list",
    isProjectsLayout,
  );

  const visible = projects.slice(0, MAX_VISIBLE);

  const openCount = (projectId: string): number =>
    entries.filter(
      (e) =>
        e.project_id === projectId &&
        e.status !== "completed" &&
        e.status !== "met",
    ).length;

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
  // cards in a row-pair to the tallest sibling's height, so flipping one
  // card to "preview" mode stretched its row-mate with dead whitespace
  // instead of letting the next card flow up. Independent columns fix that.
  const leftColumn = visible.filter((_, i) => i % 2 === 0);
  const rightColumn = visible.filter((_, i) => i % 2 === 1);
  // Drop the add-tile into the shorter column so the grid stays balanced.
  // Suppress at the cap — further creation belongs on /projects.
  const showAddTile = layout === "grid" && visible.length < MAX_VISIBLE;
  const addTileSide: "left" | "right" =
    rightColumn.length < leftColumn.length ? "right" : "left";

  if (projects.length === 0) {
    // A2: first-run home. Returning null hid the entire concept of projects
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
      <SectionHeader
        title="PROJECTS"
        seeMoreHref="/projects"
        seeMoreLabel="See all projects"
        controls={
          <SectionLayoutMenu
            options={PROJECTS_LAYOUT_OPTIONS}
            value={layout}
            onChange={setLayout}
            accessibilityLabel="Change projects layout"
          />
        }
      />
      {layout === "list" ? (
        <>
          {visible.map((p) => (
            <Link
              key={p.id}
              href={{ pathname: "/project", params: { id: p.id } }}
              asChild
            >
              <Pressable
                style={StyleSheet.flatten([
                  styles.row,
                  { backgroundColor: colors.surface },
                ])}
                accessibilityRole="button"
                accessibilityLabel={`Project ${p.title}`}
              >
                {/* Project emoji = visual identity. Falls back to a small folder
                    ink-dot when the user hasn't picked one yet — never an empty
                    slot, so the row layout is stable across projects. */}
                <ThemedText
                  type="body"
                  style={[
                    styles.projectGlyph,
                    !p.emoji && { color: colors.inkMuted },
                  ]}
                >
                  {p.emoji ?? "·"}
                </ThemedText>
                <ThemedText
                  type="body"
                  numberOfLines={1}
                  style={[styles.rowTitle, { color: colors.ink }]}
                >
                  {p.title}
                </ThemedText>
                <ThemedText type="mono" style={{ color: colors.inkMuted }}>
                  {openCount(p.id)}
                </ThemedText>
              </Pressable>
            </Link>
          ))}
          {/* List-mode add affordance: a quieter row at the bottom — the list
              has no "empty cell" the way the grid does, but the closing
              whitespace is just as deserving of a verb. Hidden once the cap
              is hit; further creation belongs on /projects. */}
          {visible.length < MAX_VISIBLE ? (
            <Pressable
              onPress={onAddProject}
              accessibilityRole="button"
              accessibilityLabel="New project"
              style={({ pressed }) => [
                styles.addRow,
                { backgroundColor: colors.surfaceSubtle },
                pressed && styles.pressed,
              ]}
            >
              <IconSymbol name="plus" size={18} color={colors.inkMuted} />
              <ThemedText
                type="body"
                style={[styles.addRowLabel, { color: colors.inkMuted }]}
              >
                New project
              </ThemedText>
            </Pressable>
          ) : null}
        </>
      ) : (
        <View style={styles.grid}>
          <View style={styles.gridColumn}>
            {leftColumn.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                rollup={projectRollup(p.id)}
              />
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
                <ThemedText
                  type="body"
                  style={[styles.addTileLabel, { color: colors.inkMuted }]}
                >
                  New project
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.gridColumn}>
            {rightColumn.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                rollup={projectRollup(p.id)}
              />
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
                <ThemedText
                  type="body"
                  style={[styles.addTileLabel, { color: colors.inkMuted }]}
                >
                  New project
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>
      )}
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    minHeight: 48,
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.md,
  },
  rowTitle: {
    flex: 1,
  },
  projectGlyph: {
    width: 22,
    textAlign: "center",
    fontSize: 18,
    lineHeight: 22,
  },
  // List-mode add affordance: a tonal-subtle row with a muted plus + label.
  // Deliberately quieter than the saturated project rows so it reads as the
  // section's terminator, not a peer item.
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,

    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.md,
  },
  addRowLabel: {},
  // Grid-mode add tile: fills its column slot end-to-end since columns now
  // own width allocation.
  addTile: {
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.xs,
    padding: tokens.space.md,
  },
  addTileLabel: {},
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
