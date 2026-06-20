import { Link } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useEntryTint, useTheme } from "@/constants/theme";

import type { DbEntry, DbProject } from "@/lib/types";

import { projectPressure, type ProjectPressure } from "@/lib/project-pressure";

/**
 * Workshop — projects ranked by what's pressing right now. Three zones:
 *
 *   1. HOT      — projects with a deadline ≤7d or an overdue todo. Each row
 *                 carries a handwritten Caveat line stating the pressure:
 *                 "Dentist deadline in 3 days." That sentence IS the project's
 *                 current ask. Row body uses the type-tint of the responsible
 *                 entry (bills for deadlines, todo for overdue todos).
 *   2. NOW LINE — a kicker-labeled tonal seam (no border, no rule). Marks the
 *                 transition from "asking something of you" to "merely there."
 *   3. STEADY   — inventory dialect: emoji + title + mono passage label.
 *                 Same vocabulary as a calm row in any other inventory.
 *
 * Below STEADY sits an ARCHIVED band (separately kickered, never tinted,
 * always passage-labeled). The archived band carries the bottom of the
 * screen so the user can find a project they put away long ago.
 *
 * Why this for this product: PRODUCT.md explicitly asks for "their projects
 * and their looming deadlines, present and glanceable." Home already does the
 * whole-board glance; the Workshop is the project-by-project glance, ranked.
 * It answers "which project should I open?" without the user having to think.
 */
export function WorkshopList({
  projects,
  entries,
}: {
  projects: DbProject[];
  entries: DbEntry[];
}): React.ReactElement {
  // Compute pressure once per render and split into bands. The HOT band is
  // sorted by sortKey (overdue first); STEADY by last-touched (freshest
  // first) so the active inventory reads top-down by recency.
  const { hot, steady, archived } = useMemo(() => {
    const active = projects.filter((p) => p.status === "active");
    const arch = projects.filter((p) => p.status === "archived");

    const withPressure = active.map((p) => ({
      project: p,
      pressure: projectPressure(p, entries),
      lastTouched: lastTouchedMs(p, entries),
    }));

    const hot = withPressure
      .filter((x) => x.pressure.band === "hot")
      .sort((a, b) => a.pressure.sortKey - b.pressure.sortKey);
    const steady = withPressure
      .filter((x) => x.pressure.band === "steady")
      .sort((a, b) => b.lastTouched - a.lastTouched);

    const archivedRows = arch.map((p) => ({
      project: p,
      pressure: { band: "steady" as const, fact: "", source: null, sortKey: 0 },
      lastTouched: lastTouchedMs(p, entries),
    }));
    return { hot, steady, archived: archivedRows };
  }, [projects, entries]);

  return (
    <View style={styles.list}>
      {hot.length > 0 ? (
        <View style={styles.band}>
          {hot.map((x) => (
            <HotRow
              key={x.project.id}
              project={x.project}
              pressure={x.pressure}
            />
          ))}
        </View>
      ) : null}

      <NowLine
        hasHot={hot.length > 0}
        hasSteady={steady.length > 0}
      />

      {steady.length > 0 ? (
        <View style={styles.band}>
          {steady.map((x) => (
            <SteadyRow
              key={x.project.id}
              project={x.project}
              lastTouchedMs={x.lastTouched}
            />
          ))}
        </View>
      ) : null}

      {archived.length > 0 ? (
        <View style={styles.archivedSection}>
          <ArchivedKicker count={archived.length} />
          <View style={styles.band}>
            {archived.map((x) => (
              <SteadyRow
                key={x.project.id}
                project={x.project}
                lastTouchedMs={x.lastTouched}
                archived
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ─── HOT row ────────────────────────────────────────────────────────────────

function HotRow({
  project,
  pressure,
}: {
  project: DbProject;
  pressure: ProjectPressure;
}): React.ReactElement {
  const { colors } = useTheme();
  // Tint matches the responsible entry type — deadline pressure reads coral,
  // overdue todo reads cyan. Equal volume rule is honored: both are at full
  // brand intensity, the row simply tells you which type is pulling.
  const tint = useEntryTint(pressure.source === "todo" ? "todo" : "deadline");
  return (
    <Link
      href={{ pathname: "/project", params: { id: project.id } }}
      asChild
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${project.title}. ${pressure.fact}`}
        style={StyleSheet.flatten([
          styles.hotRow,
          { backgroundColor: tint },
        ])}
      >
        <ThemedText
          style={[
            styles.rowGlyph,
            !project.emoji && { color: colors.inkMuted },
          ]}
        >
          {project.emoji ?? "·"}
        </ThemedText>
        <View style={styles.hotBody}>
          <ThemedText
            type="body"
            numberOfLines={1}
            style={{ color: colors.ink }}
          >
            {project.title}
          </ThemedText>
          <ThemedText
            type="hand"
            numberOfLines={2}
            style={[styles.hotFact, { color: colors.ink }]}
          >
            {pressure.fact}
          </ThemedText>
        </View>
      </Pressable>
    </Link>
  );
}

// ─── NOW LINE ───────────────────────────────────────────────────────────────

/**
 * The seam between HOT and STEADY. No border, no rule — `surfaceSubtle` band
 * with a centered kicker. The kicker copy adapts to what's around it: when
 * HOT is empty we say "NOTHING PRESSING"; when STEADY is empty we say "AND
 * THAT'S ALL." Skip rendering only when both bands are empty.
 */
function NowLine({
  hasHot,
  hasSteady,
}: {
  hasHot: boolean;
  hasSteady: boolean;
}): React.ReactElement | null {
  const { colors } = useTheme();
  if (!hasHot && !hasSteady) return null;
  const label = !hasHot
    ? "NOTHING PRESSING"
    : !hasSteady
      ? "AND THAT’S ALL"
      : "BELOW THE LINE · QUIET FOR NOW";
  return (
    <View
      style={[styles.nowLine, { backgroundColor: colors.surfaceSubtle }]}
    >
      <ThemedText
        type="micro"
        style={[styles.nowLineLabel, { color: colors.inkMuted }]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

// ─── STEADY / ARCHIVED row ─────────────────────────────────────────────────

function SteadyRow({
  project,
  lastTouchedMs,
  archived = false,
}: {
  project: DbProject;
  lastTouchedMs: number;
  archived?: boolean;
}): React.ReactElement {
  const { colors } = useTheme();
  const passage = formatPassage(lastTouchedMs);
  return (
    <Link
      href={{ pathname: "/project", params: { id: project.id } }}
      asChild
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          archived
            ? `Archived project ${project.title}, ${passage.a11y}`
            : `Project ${project.title}, ${passage.a11y}`
        }
        style={StyleSheet.flatten([
          styles.steadyRow,
          {
            backgroundColor: archived ? colors.surfaceSubtle : colors.surface,
          },
        ])}
      >
        <ThemedText
          style={[
            styles.rowGlyph,
            (!project.emoji || archived) && { color: colors.inkMuted },
          ]}
        >
          {project.emoji ?? "·"}
        </ThemedText>
        <ThemedText
          type="body"
          numberOfLines={1}
          style={[
            styles.steadyTitle,
            { color: archived ? colors.inkMuted : colors.ink },
          ]}
        >
          {project.title}
        </ThemedText>
        <ThemedText
          type="mono"
          style={{ color: colors.inkMuted }}
        >
          {passage.label}
        </ThemedText>
      </Pressable>
    </Link>
  );
}

function ArchivedKicker({ count }: { count: number }): React.ReactElement {
  const { colors } = useTheme();
  return (
    <ThemedText
      type="micro"
      style={[styles.archivedKicker, { color: colors.inkMuted }]}
    >
      ARCHIVED · {count}
    </ThemedText>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function lastTouchedMs(project: DbProject, entries: DbEntry[]): number {
  let max = 0;
  for (const e of entries) {
    if (e.project_id !== project.id) continue;
    const t = Math.max(e.updated_at ?? 0, e.created_at ?? 0);
    if (t > max) max = t;
  }
  // Fall back to the project's own timestamps so brand-new projects don't
  // collapse to "NEW forever" the moment any entry is added elsewhere.
  return Math.max(max, project.updated_at ?? 0, project.created_at ?? 0);
}

function formatPassage(lastMs: number): { label: string; a11y: string } {
  if (!lastMs) return { label: "NEW", a11y: "no entries yet" };
  const days = Math.max(0, Math.floor((Date.now() - lastMs) / 86_400_000));
  if (days <= 1) return { label: "TODAY", a11y: "touched today" };
  if (days < 7) return { label: `${days}D`, a11y: `touched ${days} days ago` };
  if (days < 30) {
    const w = Math.floor(days / 7);
    return {
      label: `${w}W`,
      a11y: `touched ${w} ${w === 1 ? "week" : "weeks"} ago`,
    };
  }
  const months = Math.floor(days / 30);
  return {
    label: `QUIET ${months}M`,
    a11y: `quiet for ${months} ${months === 1 ? "month" : "months"}`,
  };
}

const styles = StyleSheet.create({
  list: {
    gap: tokens.space.sm,
  },
  band: {
    gap: tokens.space.sm,
  },

  // HOT row — tinted body, emoji glyph, two-line stack (title + Caveat fact).
  hotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    minHeight: 64,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
  },
  hotBody: {
    flex: 1,
    gap: 2,
  },
  hotFact: {
    fontSize: 18, // Caveat optical bump per DESIGN.md
    lineHeight: 22,
  },

  // NOW LINE — tonal seating only, no border, no rule. Earns its weight
  // through padding and centered mono kicker.
  nowLine: {
    minHeight: 32,
    borderRadius: tokens.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.xs,
    marginVertical: tokens.space.xs,
  },
  nowLineLabel: {
    letterSpacing: tokens.type.micro.tracking,
  },

  // STEADY row — calm inventory dialect: emoji + title + mono passage.
  steadyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    minHeight: 48,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.lg,
  },
  steadyTitle: {
    flex: 1,
  },

  archivedSection: {
    marginTop: tokens.space.xl,
    gap: tokens.space.sm,
  },
  archivedKicker: {
    letterSpacing: tokens.type.micro.tracking,
    marginBottom: tokens.space.xs,
  },

  rowGlyph: {
    width: 22,
    textAlign: "center",
    fontSize: 18,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.7,
  },
});
