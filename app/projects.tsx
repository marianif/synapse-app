import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { AtlasCanvas } from "@/components/organisms/atlas-canvas";
import { ScreenHeader } from "@/components/organisms/screen-header";
import { WorkshopList } from "@/components/organisms/workshop-list";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";

/**
 * Projects — the all-projects index, in two complementary readouts stacked:
 *
 *   • ATLAS (top): the spatial map of your brain. Each project is a tile you
 *     can long-press and drop anywhere on the canvas; position persists per
 *     project. Answers "where in my brain does this live?".
 *
 *   • WORKSHOP (bottom): the same projects, ranked by pressure. HOT projects
 *     (deadline ≤7d or overdue todo) sit above a NOW LINE; STEADY projects
 *     sit below in inventory dialect with a passage-of-time label. Answers
 *     "which project should I open right now?".
 *
 *  The two sections speak different languages on purpose: position vs.
 *  priority. They don't compete.
 *
 *  Above both: the inception band — the only place new projects are born.
 */
export default function ProjectsScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const { projects, entries, createProject } = useDatabase();
  const [draft, setDraft] = useState("");

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
              kicker={`${active.length} ACTIVE · ${archived.length} ARCHIVED`}
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
        {/* Inception band — the only path to a new project. Framed by its
            kicker as a verb, not a control. The clay submit is the only
            saturated pressed-state on the whole screen. */}
        <View style={styles.inceptionBand}>
          <ThemedText
            type="micro"
            style={[styles.bandKicker, { color: colors.inkMuted }]}
          >
            START SOMETHING
          </ThemedText>
          <View style={[styles.createRow, { backgroundColor: colors.surface }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={submit}
              placeholder="Name a project"
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
        </View>

        {projects.length === 0 ? (
          <ThemedText
            type="hand"
            style={[styles.empty, { color: colors.inkMuted }]}
          >
            Nothing in the inventory yet. Name one above, or promote an idea
            from its detail page.
          </ThemedText>
        ) : (
          <>
            {/* ATLAS — spatial map. Section kicker carries the affordance
                hint so users discover the long-press to move. */}
            <View style={styles.section}>
              <ThemedText
                type="micro"
                style={[styles.sectionKicker, { color: colors.inkMuted }]}
              >
                ATLAS · LONG-PRESS TO MOVE
              </ThemedText>
              <AtlasCanvas projects={projects} />
            </View>

            {/* WORKSHOP — ranked by pressure. The kicker frames the read:
                "what's pressing" is the question this section answers. */}
            <View style={styles.section}>
              <ThemedText
                type="micro"
                style={[styles.sectionKicker, { color: colors.inkMuted }]}
              >
                WORKSHOP · WHAT’S PRESSING
              </ThemedText>
              <WorkshopList projects={projects} entries={entries} />
            </View>
          </>
        )}
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
    gap: tokens.space.xl,
  },

  inceptionBand: {
    gap: tokens.space.sm,
  },
  bandKicker: {
    letterSpacing: tokens.type.micro.tracking,
  },
  createRow: {
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

  section: {
    gap: tokens.space.sm,
  },
  sectionKicker: {
    letterSpacing: tokens.type.micro.tracking,
    marginBottom: tokens.space.xs,
  },

  empty: {
    paddingVertical: tokens.space.xl,
    textAlign: "center",
    fontSize: 18,
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.7,
  },
});
