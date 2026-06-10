import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";
import type { DbEntry, DbProject } from "@/lib/types";

interface ProjectsStripProps {
  projects: DbProject[];
  entries: DbEntry[];
}

/**
 * Projects on the field — a compact row in the narrative zone, referenced by
 * name, never a bento tile of their own. Each chip carries its open count;
 * the trailing key opens the projects screen. Hidden entirely when there are
 * no projects: the feature introduces itself through idea promotion instead.
 */
export function ProjectsStrip({
  projects,
  entries,
}: ProjectsStripProps): React.ReactElement | null {
  const { colors } = useTheme();
  const router = useRouter();

  const active = projects.filter((p) => p.status === "active");
  if (active.length === 0) return null;

  const openCount = (projectId: string): number =>
    entries.filter(
      (e) =>
        e.project_id === projectId &&
        e.status !== "completed" &&
        e.status !== "met",
    ).length;

  return (
    <View style={styles.block}>
      <ThemedText type="micro" muted>
        PROJECTS · {active.length}
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rowContent}
      >
        {active.map((p) => {
          const count = openCount(p.id);
          return (
            <Pressable
              key={p.id}
              onPress={() =>
                router.push({ pathname: "/project", params: { id: p.id } })
              }
              accessibilityRole="button"
              accessibilityLabel={`Project ${p.title}, ${count} open`}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: colors.surface },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                type="item"
                numberOfLines={1}
                style={[styles.chipTitle, { color: colors.ink }]}
              >
                {p.title}
              </ThemedText>
              {count > 0 ? (
                <ThemedText type="mono" style={{ color: colors.inkMuted }}>
                  {count}
                </ThemedText>
              ) : null}
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => router.push({ pathname: "/projects" })}
          accessibilityRole="button"
          accessibilityLabel="All projects"
          style={({ pressed }) => [
            styles.chip,
            { backgroundColor: colors.surfaceSubtle },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="mono" style={{ color: colors.inkMuted }}>
            all ›
          </ThemedText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: tokens.space.sm,
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    minHeight: 44,
    maxWidth: 220,
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.md,
  },
  chipTitle: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
