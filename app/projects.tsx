import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { ScreenHeader } from "@/components/organisms/screen-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";

/**
 * Projects — the macro life areas todos, deadlines and ideas can be attributed
 * to. Projects are not entries: they never sit on the board as items; they are
 * referenced by name in the narrative zone and opened up here.
 */
export default function ProjectsScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const { projects, entries, createProject } = useDatabase();
  const [draft, setDraft] = useState("");

  // Open items filed under each project, for the trailing mono count.
  const openCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) {
      if (!e.project_id) continue;
      if (e.status === "completed" || e.status === "met") continue;
      counts[e.project_id] = (counts[e.project_id] ?? 0) + 1;
    }
    return counts;
  }, [entries]);

  const active = projects.filter((p) => p.status === "active");
  const archived = projects.filter((p) => p.status === "archived");

  const submit = (): void => {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    createProject(title).catch((err) =>
      console.error("Failed to create project:", err),
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => (
            <ScreenHeader
              title="Projects"
              kicker={`${active.length} ACTIVE`}
              onBack={() => router.back()}
              inset
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
        {/* Inline create — a line you fill, mirroring the capture grammar. */}
        <View style={[styles.createRow, { backgroundColor: colors.surface }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={submit}
            placeholder="Start a project"
            placeholderTextColor={colors.inkMuted}
            returnKeyType="done"
            accessibilityLabel="New project title"
            style={[styles.createInput, { color: colors.ink }]}
          />
          {draft.trim().length > 0 ? (
            <Pressable
              onPress={submit}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Create project"
              style={({ pressed }) => [
                styles.createBtn,
                { backgroundColor: colors.accent.clay },
                pressed && styles.pressed,
              ]}
            >
              <IconSymbol
                name="arrow-up"
                size={20}
                color={colors.accent.onClay}
              />
            </Pressable>
          ) : null}
        </View>

        {active.length === 0 && archived.length === 0 ? (
          <ThemedText type="body" muted style={styles.empty}>
            Nothing here yet. Start one above, or promote an idea from its
            detail page.
          </ThemedText>
        ) : null}

        {active.map((p) => (
          <Pressable
            key={p.id}
            onPress={() =>
              router.push({ pathname: "/project", params: { id: p.id } })
            }
            accessibilityRole="button"
            accessibilityLabel={`Project ${p.title}`}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: colors.surface },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText
              type="item"
              numberOfLines={1}
              style={[styles.rowTitle, { color: colors.ink }]}
            >
              {p.title}
            </ThemedText>
            <ThemedText type="mono" style={{ color: colors.inkMuted }}>
              {openCounts[p.id] ? `${openCounts[p.id]} open` : "quiet"}
            </ThemedText>
          </Pressable>
        ))}

        {archived.length > 0 ? (
          <>
            <ThemedText type="micro" muted style={styles.sectionLabel}>
              ARCHIVED
            </ThemedText>
            {archived.map((p) => (
              <Pressable
                key={p.id}
                onPress={() =>
                  router.push({ pathname: "/project", params: { id: p.id } })
                }
                accessibilityRole="button"
                accessibilityLabel={`Archived project ${p.title}`}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: colors.surfaceSubtle },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  type="item"
                  numberOfLines={1}
                  style={[styles.rowTitle, { color: colors.inkMuted }]}
                >
                  {p.title}
                </ThemedText>
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
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
    gap: tokens.space.sm,
  },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderRadius: tokens.radius.md,
    paddingLeft: tokens.space.lg,
    paddingRight: tokens.space.sm,
    marginBottom: tokens.space.sm,
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    minHeight: 52,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.lg,
  },
  rowTitle: {
    flex: 1,
  },
  sectionLabel: {
    marginTop: tokens.space.lg,
    marginBottom: tokens.space.xs,
  },
  empty: {
    paddingVertical: tokens.space.xl,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
