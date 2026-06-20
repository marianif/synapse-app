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
import { tokens, useTheme } from "@/constants/theme";
import { useUiPreference } from "@/hooks/use-ui-preference";
import { byRunway } from "@/lib/direct-when";

import type { DbEntry, DbProject } from "@/lib/types";

/**
 * Projects overview — the macro life areas, present at a glance with a live
 * open-item count. Hidden until the first project exists. Each row opens the
 * project.
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

export function ProjectsOverview({
  projects,
  entries,
}: {
  projects: DbProject[];
  entries: DbEntry[];
}): React.ReactElement | null {
  const { colors } = useTheme();
  const [layout, setLayout] = useUiPreference<ProjectsLayout>(
    "section.layout.projects",
    "list",
    isProjectsLayout,
  );
  if (projects.length === 0) return null;

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
        projects.map((p) => (
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
        ))
      ) : (
        <View style={styles.grid}>
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} rollup={projectRollup(p.id)} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: tokens.space.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
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
});
