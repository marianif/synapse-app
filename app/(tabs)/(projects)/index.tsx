import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/atoms/themed-text";
import { ProjectRow } from "@/components/molecules/project-row";
import { AddProjectBar } from "@/components/organisms/add-project-bar";
import { ScreenHeader } from "@/components/organisms/screen-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import { useUiPreference } from "@/hooks/use-ui-preference";

import type { DbProject } from "@/lib/types";

// ─── Sort mode ───────────────────────────────────────────────────────────────
// Three modes only. A fourth would turn the cycle-tap into a menu, and a menu
// becomes shopping. RECENT covers ~90% of "where was I last," BUSY answers
// "what's on fire," A–Z is the index-of-known-name escape hatch.

type SortMode = "recent" | "busy" | "az";
const SORT_LABEL: Record<SortMode, string> = {
  recent: "RECENT",
  busy: "BUSY",
  az: "A–Z",
};
const SORT_NEXT: Record<SortMode, SortMode> = {
  recent: "busy",
  busy: "az",
  az: "recent",
};
function isSortMode(value: string | null): value is SortMode {
  return value === "recent" || value === "busy" || value === "az";
}

/**
 * The Project Shelf — `app/(tabs)/projects/index.tsx`, the Projects tab's
 * root screen.
 *
 * Three verbs live here and nowhere else:
 *   1. FIND a project (the sort chip cycles RECENT / BUSY / A–Z)
 *   2. FEATURE a project (the star toggle on each row; the only knob that
 *      decides what `ProjectsOverview` on home surfaces)
 *   3. OPEN a project (tap the row body)
 *
 * Project mutations (rename, emoji, archive, delete) live on the project
 * detail screen. This screen is a shelf, not a tool drawer — keeping the
 * verb set tight is the whole point of the rethink.
 *
 * The home is the map; this is where you choose what's on it.
 */
export default function ProjectsScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { projects, entries, createProject, setProjectFeatured } =
    useDatabase();

  // Lift the floating composer band above the keyboard. The band sits at
  // bottom: 28, so we translate it up by (keyboardHeight − that offset − safe
  // inset) whenever the keyboard is open. Reanimated's keyboard value tracks
  // the show/hide animation, so the band rides up in sync.
  const keyboard = useAnimatedKeyboard();
  const composerLift = useAnimatedStyle(() => {
    // Dock rests at bottom: space.lg. Lift it by the keyboard height minus the
    // safe-area inset the keyboard already covers, so the bar sits just above.
    const overlap = keyboard.height.value - insets.bottom;
    return { transform: [{ translateY: -Math.max(overlap, 0) }] };
  });
  const [draft, setDraft] = useState("");
  const [archivedOpen, setArchivedOpen] = useState(false);
  // Search query filters the active shelf by title. Empty string = show all.
  const [query, setQuery] = useState("");
  // The create affordance is a FAB, not an always-visible input — with many
  // projects an inline "name a project" row would push the shelf down. Tapping
  // the FAB reveals a single-purpose composer band above it.
  const [composing, setComposing] = useState(false);

  const [sort, setSort] = useUiPreference<SortMode>(
    "projects.sort",
    "recent",
    isSortMode,
  );

  const active = useMemo(
    () => projects.filter((p) => p.status === "active"),
    [projects],
  );
  const archived = useMemo(
    () => projects.filter((p) => p.status === "archived"),
    [projects],
  );
  const featuredCount = useMemo(
    () => active.filter((p) => p.is_featured === 1).length,
    [active],
  );

  // Per-project open-item rollup. Same shape every sort mode reads from, so
  // changing sort never re-walks the entry list more than once. The shelf
  // doesn't show counts per type beyond "open + deadlines" — the project
  // detail is the place for full breakdowns.
  const openByProject = useMemo(() => {
    const map = new Map<string, { open: number; deadlines: number }>();
    for (const p of projects) map.set(p.id, { open: 0, deadlines: 0 });
    for (const e of entries) {
      if (!e.project_id) continue;
      if (e.status === "completed" || e.status === "met") continue;
      const slot = map.get(e.project_id);
      if (!slot) continue;
      slot.open += 1;
      if (e.type === "deadline") slot.deadlines += 1;
    }
    return map;
  }, [projects, entries]);

  const sortedActive = useMemo(
    () => sortProjects(active, sort, openByProject),
    [active, sort, openByProject],
  );

  // Title-substring filter, case-insensitive. Applied after sort so the shelf
  // keeps its chosen order; search narrows, it doesn't re-rank.
  const visibleActive = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedActive;
    return sortedActive.filter((p) => p.title.toLowerCase().includes(q));
  }, [sortedActive, query]);

  // Create + navigate. Shared by the fresh-install inception band (CreateRow)
  // and the FAB-raised AddProjectBar.
  const handleCreateProject = (title: string): void => {
    const name = title.trim();
    if (!name) return;
    setDraft("");
    setComposing(false);
    createProject(name)
      .then((project) =>
        router.push({
          pathname: "/(tabs)/(projects)/project",
          params: { id: project.id },
        }),
      )
      .catch((err) => console.error("Failed to create project:", err));
  };

  const submitDraft = (): void => handleCreateProject(draft);

  const openComposer = (): void => {
    void Haptics.selectionAsync();
    setComposing(true);
  };

  const toggleFeatured = (project: DbProject): void => {
    void Haptics.selectionAsync();
    setProjectFeatured(project.id, project.is_featured !== 1).catch((err) =>
      console.error("Failed to toggle featured:", err),
    );
  };

  const cycleSort = (): void => setSort(SORT_NEXT[sort]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => (
            <ScreenHeader
              title="Projects"
              kicker={`${featuredCount} FEATURED · ${active.length} TOTAL`}
              onBack={() => router.back()}
            />
          ),
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {projects.length === 0 ? (
          // Fresh install: the inception band IS the screen. No sort chip, no
          // archived disclosure, no shelf — pick a name and land in the project.
          <View style={styles.inceptionBand}>
            <ThemedText
              type="hand"
              style={[styles.inceptionHint, { color: colors.inkMuted }]}
            >
              Name your first life area
            </ThemedText>
            <CreateRow
              draft={draft}
              setDraft={setDraft}
              onSubmit={submitDraft}
              placeholder="A project, a season, a chapter…"
              colors={colors}
            />
          </View>
        ) : (
          <>
            {/* Search bar — filters the active shelf by title. Sits above the
                sort chip so "find by name" reads as the primary entry point
                once the shelf grows past a screenful. */}
            <View
              style={[
                styles.searchBar,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <IconSymbol name="Search" size={18} color={colors.inkMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search projects"
                placeholderTextColor={colors.inkMuted}
                returnKeyType="search"
                autoCorrect={false}
                clearButtonMode="while-editing"
                accessibilityLabel="Search projects"
                style={[styles.searchInput, { color: colors.ink }]}
              />
              {query.length > 0 ? (
                <Pressable
                  onPress={() => setQuery("")}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <IconSymbol
                    name="CloseSquare2"
                    size={18}
                    color={colors.inkMuted}
                  />
                </Pressable>
              ) : null}
            </View>

            {/* Sort chip — one Pressable, taps cycle through three modes.
                The ⇅ glyph signals it's a cycle, not a fixed label. */}
            <Pressable
              onPress={cycleSort}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${SORT_LABEL[sort]}. Tap to change.`}
              style={({ pressed }) => [
                styles.sortChip,
                {
                  backgroundColor: pressed
                    ? colors.surface
                    : colors.surfaceSubtle,
                },
              ]}
            >
              <ThemedText
                type="micro"
                style={[styles.sortChipLabel, { color: colors.inkMuted }]}
              >
                {`SORTED · ${SORT_LABEL[sort]}`}
              </ThemedText>
              <IconSymbol name="ArrowSwap2" size={14} color={colors.inkMuted} />
            </Pressable>

            {/* The shelf itself. */}
            {visibleActive.length > 0 ? (
              <View style={styles.rowList}>
                {visibleActive.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    signal={signalFor(project, sort, openByProject)}
                    onToggleFeatured={() => toggleFeatured(project)}
                  />
                ))}
              </View>
            ) : (
              <ThemedText
                type="hand"
                style={[styles.noMatch, { color: colors.inkMuted }]}
              >
                {`No projects match “${query.trim()}”`}
              </ThemedText>
            )}

            {/* Archived disclosure — collapsed by default. Single tap on a
                row inside opens the project's detail, where the unarchive
                action already lives. The shelf doesn't duplicate it. */}
            {archived.length > 0 ? (
              <View style={styles.archivedSection}>
                <Pressable
                  onPress={() => setArchivedOpen((o) => !o)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: archivedOpen }}
                  accessibilityLabel={`Archived projects, ${archived.length}`}
                  style={styles.archivedHeader}
                >
                  <IconSymbol
                    name={archivedOpen ? "ChevronDown" : "ChevronRight"}
                    size={16}
                    color={colors.inkMuted}
                  />
                  <ThemedText
                    type="micro"
                    style={[styles.archivedKicker, { color: colors.inkMuted }]}
                  >
                    {`ARCHIVED · ${archived.length}`}
                  </ThemedText>
                </Pressable>
                {archivedOpen ? (
                  <View style={styles.rowList}>
                    {archived.map((project) => (
                      <ArchivedRow
                        key={project.id}
                        project={project}
                        colors={colors}
                        onOpen={() =>
                          router.push({
                            pathname: "/(tabs)/(projects)/project",
                            params: { id: project.id },
                          })
                        }
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Create affordance — a FAB, not an inline row. Hidden on fresh install
          (the inception band owns that state). Tapping it raises the
          AddProjectBar — the "NEW PROJECT" instrument that lives here on the
          shelf — which rides above the keyboard via the dock's UI-thread
          translate. */}
      {projects.length > 0 ? (
        <Animated.View style={[styles.composerDock, composerLift]}>
          {composing ? (
            <AddProjectBar
              onCreateProject={handleCreateProject}
              onDismissEmpty={() => setComposing(false)}
            />
          ) : (
            <Pressable
              onPress={openComposer}
              accessibilityRole="button"
              accessibilityLabel="New project"
              style={({ pressed }) => [
                styles.createFab,
                { backgroundColor: colors.accent.clay },
                pressed && styles.pressed,
              ]}
            >
              <IconSymbol name="Plus" size={28} color={colors.accent.onClay} />
            </Pressable>
          )}
        </Animated.View>
      ) : null}
    </View>
  );
}

// ─── Subcomponents (kept inline; one-off, never reused) ─────────────────────

function CreateRow({
  draft,
  setDraft,
  onSubmit,
  placeholder,
  colors,
}: {
  draft: string;
  setDraft: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  colors: ReturnType<typeof useTheme>["colors"];
}): React.ReactElement {
  return (
    <View style={[styles.createRow, { backgroundColor: colors.surface }]}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        returnKeyType="done"
        accessibilityLabel="New project title"
        style={[styles.createInput, { color: colors.ink }]}
      />
      {draft.trim().length > 0 ? (
        <Pressable
          onPress={onSubmit}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Create project"
          style={({ pressed }) => [
            styles.createBtn,
            { backgroundColor: colors.accent.clay },
            pressed && styles.pressed,
          ]}
        >
          <IconSymbol name="ArrowUp" size={20} color={colors.accent.onClay} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ArchivedRow({
  project,
  colors,
  onOpen,
}: {
  project: DbProject;
  colors: ReturnType<typeof useTheme>["colors"];
  onOpen: () => void;
}): React.ReactElement {
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Open archived ${project.title}`}
      style={[styles.archivedRow, { backgroundColor: colors.surfaceSubtle }]}
    >
      {project.emoji ? (
        <ThemedText type="item">{project.emoji}</ThemedText>
      ) : null}
      <ThemedText
        type="item"
        numberOfLines={1}
        style={[styles.archivedTitle, { color: colors.ink }]}
      >
        {project.title}
      </ThemedText>
    </Pressable>
  );
}

// ─── Sort + signal helpers ──────────────────────────────────────────────────

function sortProjects(
  list: DbProject[],
  mode: SortMode,
  openByProject: Map<string, { open: number; deadlines: number }>,
): DbProject[] {
  const copy = [...list];
  switch (mode) {
    case "recent": {
      // last_opened_at preferred; fall back to updated_at*1000 (seconds → ms)
      // so projects that were edited but never opened still sort meaningfully.
      const stamp = (p: DbProject): number =>
        p.last_opened_at ?? p.updated_at * 1000;
      return copy.sort((a, b) => stamp(b) - stamp(a));
    }
    case "busy": {
      // Open count desc; ties broken by deadlines desc, then title for stability.
      return copy.sort((a, b) => {
        const oa = openByProject.get(a.id) ?? { open: 0, deadlines: 0 };
        const ob = openByProject.get(b.id) ?? { open: 0, deadlines: 0 };
        if (ob.open !== oa.open) return ob.open - oa.open;
        if (ob.deadlines !== oa.deadlines) return ob.deadlines - oa.deadlines;
        return a.title.localeCompare(b.title);
      });
    }
    case "az":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
  }
}

function signalFor(
  project: DbProject,
  mode: SortMode,
  openByProject: Map<string, { open: number; deadlines: number }>,
): string {
  const slot = openByProject.get(project.id) ?? { open: 0, deadlines: 0 };
  switch (mode) {
    case "recent": {
      const ms = project.last_opened_at ?? project.updated_at * 1000;
      return relativeStamp(ms);
    }
    case "busy": {
      if (slot.open === 0) return "quiet";
      const openLabel = `${slot.open} open`;
      if (slot.deadlines > 0) {
        return `${openLabel} · ${slot.deadlines} ${
          slot.deadlines === 1 ? "deadline" : "deadlines"
        }`;
      }
      return openLabel;
    }
    case "az":
      // The signal slot stays informative even when sort is A–Z, but quietly:
      // just the open count. Empty if zero — alpha sort is for finding by name.
      return slot.open === 0 ? "" : `${slot.open} open`;
  }
}

// Plain ms-since → short relative stamp. No external dep (the project already
// has dayjs but this is a one-line helper; keeping it inline avoids a
// dependency on the home/detail formatting style for what's a shelf detail).
function relativeStamp(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    padding: tokens.space.lg,
    gap: tokens.space.xxl,
    paddingBottom: tokens.space.xxxl * 2,
  },

  // Sort chip — a self-contained pill, never edge-to-edge like a tab control.
  sortChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.xs,
    borderRadius: tokens.radius.pill,
    minHeight: 32,
  },
  sortChipLabel: {
    letterSpacing: tokens.type.micro.tracking,
  },

  // Search bar — pill, tonal fill (no 1px border, per the design system).
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    minHeight: 44,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.pill,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: tokens.type.item.size,
    fontFamily: tokens.type.fontInter.medium,
  },

  rowList: {
    gap: tokens.space.xs,
  },

  noMatch: {
    textAlign: "center",
    paddingVertical: tokens.space.lg,
  },

  // Inception band — same input/clay-submit pattern as before, but framed by
  // a Caveat margin-note so it reads as an aside, not a primary affordance.
  inceptionBand: {
    gap: tokens.space.sm,
    alignItems: "center",
  },
  inceptionHint: {
    textAlign: "center",
  },
  createRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderRadius: tokens.radius.md,
    paddingLeft: tokens.space.lg,
    paddingRight: tokens.space.sm,
  },
  createInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: tokens.type.item.size,
    fontFamily: tokens.type.fontInter.medium,
  },
  createBtn: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },

  // Archived disclosure
  archivedSection: {
    gap: tokens.space.sm,
  },
  archivedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingVertical: tokens.space.sm,
  },
  archivedKicker: {
    letterSpacing: tokens.type.micro.tracking,
  },
  archivedRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.md,
  },
  archivedTitle: { flex: 1 },

  // Composer dock — full-width, resting at bottom: space.lg, lifted above the
  // keyboard by composerLift. Holds either the raised AddProjectBar (full width)
  // or, idle, the "+" FAB pinned right.
  composerDock: {
    position: "absolute",
    left: tokens.space.lg,
    right: tokens.space.lg,
    bottom: tokens.space.lg,
  },
  // Create FAB — pinned right within the full-width dock (the AddProjectBar,
  // when raised, fills the dock instead).
  createFab: {
    alignSelf: "flex-end",
    width: 56,
    height: 56,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    ...tokens.elevation.capture,
  },

  pressed: { opacity: 0.7 },
});
