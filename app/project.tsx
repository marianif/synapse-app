import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { ConfirmSheet } from "@/components/molecules/confirm-sheet";
import { ScreenHeader } from "@/components/organisms/screen-header";
import { entryColor, tokens, useTheme } from "@/constants/theme";
import { useConfirm } from "@/hooks/use-confirm";
import { useDatabase } from "@/hooks/use-database/use-database";
import { useDiary } from "@/hooks/use-diary";
import { horizonReadout } from "@/lib/horizons";
import { ConfirmKey } from "@/lib/settings";
import { isTodoFamily } from "@/lib/taxonomy";
import type { DbEntry } from "@/lib/types";

const isDone = (e: DbEntry): boolean =>
  e.status === "completed" || e.status === "met";

/**
 * A project opened up: the todos and deadlines filed under it, the ideas it
 * carries, the notes written about it, and where it came from (if it was
 * promoted from an idea). Archive when a life area goes quiet; delete unfiles
 * its items — they survive on the board, just unowned.
 */
export default function ProjectScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { projects, entries, updateProject, deleteProject } = useDatabase();
  const { entries: diaryEntries } = useDiary();

  const project = projects.find((p) => p.id === id);

  const deleteConfirm = useConfirm({ confirmKey: ConfirmKey.deleteProject });

  const requestDelete = (): void => {
    if (!project) return;
    deleteConfirm.request(() => {
      deleteProject(project.id)
        .then(() => router.back())
        .catch((err) => console.error("Failed to delete project:", err));
    });
  };

  const { open, ideas, origin, notes } = useMemo(() => {
    const filed = entries.filter((e) => e.project_id === id);
    return {
      open: filed.filter((e) => isTodoFamily(e.type) && !isDone(e)),
      ideas: filed.filter((e) => e.type === "idea" && !isDone(e)),
      origin: entries.find(
        (e) => e.type === "idea" && e.promoted_project_id === id,
      ),
      notes: diaryEntries.filter((n) => n.linked_project_id === id),
    };
  }, [entries, diaryEntries, id]);

  if (!project) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.paper }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            header: () => (
              <ScreenHeader title="Project" onBack={() => router.back()} inset />
            ),
          }}
        />
        <ThemedText type="body" muted style={styles.empty}>
          This project is gone.
        </ThemedText>
      </View>
    );
  }

  const archived = project.status === "archived";

  const openEntry = (e: DbEntry): void =>
    router.push({
      pathname: "/detail",
      params: { id: e.id, entryType: e.type },
    });

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => (
            <ScreenHeader
              title={project.title}
              kicker={archived ? "ARCHIVED PROJECT" : "PROJECT"}
              onBack={() => router.back()}
              inset
            />
          ),
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Provenance — the idea this project grew out of. */}
        {origin ? (
          <Pressable
            onPress={() => openEntry(origin)}
            accessibilityRole="button"
            accessibilityLabel={`Born from idea: ${origin.title}`}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <ThemedText type="hand" style={{ color: colors.inkMuted }}>
              Born from “{origin.title}”.
            </ThemedText>
          </Pressable>
        ) : null}

        {/* The actionable spine — open todos and deadlines filed here. */}
        <View style={styles.section}>
          <ThemedText type="micro" muted>
            ON THE LINE · {open.length}
          </ThemedText>
          {open.length === 0 ? (
            <ThemedText type="body" muted>
              Nothing filed here yet. File a todo from its detail page.
            </ThemedText>
          ) : (
            open.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => openEntry(e)}
                accessibilityRole="button"
                accessibilityLabel={e.title}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: colors.surface },
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.edgeBar,
                    { backgroundColor: entryColor(e.type) },
                  ]}
                />
                <ThemedText
                  type="item"
                  numberOfLines={1}
                  style={[styles.rowTitle, { color: colors.ink }]}
                >
                  {e.title}
                </ThemedText>
                {e.due_range ? (
                  <ThemedText type="mono" style={{ color: colors.inkMuted }}>
                    {horizonReadout(e.due_range, e.due_date)}
                  </ThemedText>
                ) : null}
              </Pressable>
            ))
          )}
        </View>

        {/* Ideas carried by this project. */}
        {ideas.length > 0 ? (
          <View style={styles.section}>
            <ThemedText type="micro" muted>
              IDEAS · {ideas.length}
            </ThemedText>
            {ideas.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => openEntry(e)}
                accessibilityRole="button"
                accessibilityLabel={`Idea: ${e.title}`}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: colors.surface },
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.edgeBar,
                    { backgroundColor: entryColor("idea") },
                  ]}
                />
                <ThemedText
                  type="item"
                  numberOfLines={1}
                  style={[styles.rowTitle, { color: colors.ink }]}
                >
                  {e.title}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Notes written about this project — reflective, never actionable. */}
        {notes.length > 0 ? (
          <View style={styles.section}>
            <ThemedText type="micro" muted>
              NOTES · {notes.length}
            </ThemedText>
            {notes.map((n) => (
              <View
                key={n.id}
                style={[
                  styles.noteRow,
                  { backgroundColor: colors.surfaceSubtle },
                ]}
              >
                <ThemedText type="hand" style={{ color: colors.ink }}>
                  {n.body}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : null}

        {/* Quiet management actions — no slab, these are secondary. */}
        <View style={styles.manageRow}>
          <Pressable
            onPress={() =>
              updateProject(project.id, {
                status: archived ? "active" : "archived",
              }).catch((err) => console.error("Failed to archive:", err))
            }
            accessibilityRole="button"
            accessibilityLabel={archived ? "Reactivate project" : "Archive project"}
            style={({ pressed }) => [styles.manageBtn, pressed && styles.pressed]}
          >
            <ThemedText type="bodyBold" muted>
              {archived ? "Reactivate" : "Archive"}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={requestDelete}
            accessibilityRole="button"
            accessibilityLabel="Delete project"
            style={({ pressed }) => [styles.manageBtn, pressed && styles.pressed]}
          >
            <ThemedText type="bodyBold" style={{ color: colors.feedback.danger }}>
              Delete
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <ConfirmSheet
        visible={deleteConfirm.visible}
        kicker="DELETE PROJECT"
        message="Its todos and ideas stay on the board, just unfiled."
        dontAsk={deleteConfirm.dontAsk}
        onToggleDontAsk={deleteConfirm.toggleDontAsk}
        onConfirm={deleteConfirm.confirm}
        onCancel={deleteConfirm.cancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: tokens.space.lg,
    gap: tokens.space.xl,
  },
  section: {
    gap: tokens.space.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    minHeight: 48,
    borderRadius: tokens.radius.md,
    overflow: "hidden",
    paddingRight: tokens.space.lg,
  },
  edgeBar: {
    width: 3,
    alignSelf: "stretch",
  },
  rowTitle: {
    flex: 1,
  },
  noteRow: {
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
  },
  manageRow: {
    flexDirection: "row",
    gap: tokens.space.xl,
    paddingTop: tokens.space.lg,
  },
  manageBtn: {
    minHeight: 44,
    justifyContent: "center",
  },
  empty: {
    padding: tokens.space.xl,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
