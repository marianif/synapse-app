import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useReducedMotion,
} from "react-native-reanimated";

import { SketchIcon } from "@/components/atoms/sketch-icon";
import { ThemedText } from "@/components/atoms/themed-text";
import { WhenPicker } from "@/components/molecules/when-picker";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LinkableIdea } from "@/components/organisms/link-sheet";
import { entryColor, tokens, useTheme } from "@/constants/theme";
import { horizonEndDate, horizonLabel } from "@/lib/horizons";
import type { DbProject, DueRange } from "@/lib/types";

// A recent idea the captured thought can be filed under — same shape the link
// sheet uses, re-exported so call-sites can import it from either place.
export type { LinkableIdea };

/**
 * Where a captured thought is filed. `todo`/`deadline` carry the optional detail
 * the writer opened the "+ details" strip to set; `idea`/`note`/`note-on` are
 * bare. There is no longer a "more" escape hatch — the rich modal was retired and
 * capture is the single creation path (PRODUCT.md: one trigger, no second add).
 */
export type CaptureResolution =
  | {
      kind: "todo";
      scheduledDate?: string;
      scheduledTime?: string;
      projectId?: string;
    }
  | {
      kind: "deadline";
      dueDate?: string;
      dueTime?: string;
      dueRange?: DueRange;
      projectId?: string;
    }
  | { kind: "idea" }
  | { kind: "note" }
  | { kind: "note-on"; entryId: string };

interface CaptureResolverProps {
  /** The thought just captured — echoed so the user knows what they're filing. */
  text: string;
  /** Recent ideas offered under "Note on…". Empty hides that affordance. */
  ideas: LinkableIdea[];
  /** Active projects offered in the optional detail strip. */
  projects: DbProject[];
  /** Whether the "Note on…" idea picker is expanded. */
  picking: boolean;
  onTogglePicking: () => void;
  /** Commit a destination. */
  onResolve: (resolution: CaptureResolution) => void;
  /** Discard the pending thought without filing it. */
  onDismiss: () => void;
}

// The dated destinations that can carry detail. Idea/note are always bare.
type DatedKind = "todo" | "deadline";

/**
 * The post-capture destination chooser. The capture bar files nothing on its
 * own — it hands the thought here, and this row lets the writer file it as an
 * idea, a to-do, a deadline, an autonomous diary note, or a note ON a recent
 * idea. The fast path is one tap; a "+ details" strip optionally sets a date,
 * a deadline horizon, and a project at capture time. It stays until the writer
 * picks (no auto-commit) and wears the amber capture identity on its left edge.
 */
export function CaptureResolver({
  text,
  ideas,
  projects,
  picking,
  onTogglePicking,
  onResolve,
  onDismiss,
}: CaptureResolverProps): React.ReactElement {
  const { colors } = useTheme();
  const reduced = useReducedMotion();

  // The optional detail strip — collapsed by default so the common path stays
  // one tap. Opening it commits to a dated destination (todo or deadline).
  const [detailKind, setDetailKind] = useState<DatedKind | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [dueRange, setDueRange] = useState<DueRange | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  const activeProjects = projects.filter((p) => p.status === "active");

  function commitDated(kind: DatedKind): void {
    if (kind === "deadline") {
      onResolve({
        kind: "deadline",
        dueDate: dueRange
          ? horizonEndDate(dueRange)
          : date.trim() || undefined,
        dueTime: dueRange ? undefined : time.trim() || undefined,
        dueRange: dueRange ?? undefined,
        projectId: projectId ?? undefined,
      });
    } else {
      onResolve({
        kind: "todo",
        scheduledDate: date.trim() || undefined,
        scheduledTime: time.trim() || undefined,
        projectId: projectId ?? undefined,
      });
    }
  }

  const detailAccent = detailKind ? entryColor(detailKind) : colors.type.todo;

  return (
    <Animated.View
      entering={reduced ? undefined : FadeIn.duration(160)}
      exiting={reduced ? undefined : FadeOut.duration(120)}
      style={[styles.card, { backgroundColor: colors.surface }]}
    >
      <View style={[styles.edge, { backgroundColor: colors.type.ideas }]} />

      <View style={styles.body}>
        <View style={styles.headRow}>
          <ThemedText type="micro" style={{ color: colors.inkMuted }}>
            FILE AS
          </ThemedText>
          <ThemedText
            type="body"
            numberOfLines={1}
            style={[styles.echo, { color: colors.inkMuted }]}
          >
            {text}
          </ThemedText>
          <Pressable
            onPress={onDismiss}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Discard this thought"
            style={styles.dismiss}
          >
            <IconSymbol name="close" size={16} color={colors.inkMuted} />
          </Pressable>
        </View>

        {picking ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.pickerRow}
          >
            <Pressable
              onPress={onTogglePicking}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back to destinations"
              style={[styles.chip, { backgroundColor: colors.surfaceSubtle }]}
            >
              <ThemedText type="micro" style={{ color: colors.inkMuted }}>
                ‹ BACK
              </ThemedText>
            </Pressable>
            {ideas.map((idea) => (
              <Pressable
                key={idea.id}
                onPress={() => onResolve({ kind: "note-on", entryId: idea.id })}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Note on idea: ${idea.title}`}
                style={[styles.chip, { backgroundColor: colors.surfaceSubtle }]}
              >
                <SketchIcon type="idea" size={14} />
                <ThemedText
                  type="body"
                  numberOfLines={1}
                  style={[styles.chipIdeaLabel, { color: colors.ink }]}
                >
                  {idea.title}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.actionRow}
            >
              <Pressable
                onPress={() => onResolve({ kind: "idea" })}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="File as idea"
                style={[styles.chip, { backgroundColor: colors.type.ideas + "24" }]}
              >
                <SketchIcon type="idea" size={15} />
                <ThemedText type="micro" style={{ color: colors.ink }}>
                  IDEA
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => commitDated("todo")}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="File as to-do"
                style={[styles.chip, { backgroundColor: colors.type.todo + "24" }]}
              >
                <ThemedText type="micro" style={{ color: colors.ink }}>
                  TODO
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => commitDated("deadline")}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="File as deadline"
                style={[styles.chip, { backgroundColor: colors.type.bills + "24" }]}
              >
                <ThemedText type="micro" style={{ color: colors.ink }}>
                  DEADLINE
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => onResolve({ kind: "note" })}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="File as diary note"
                style={[styles.chip, { backgroundColor: colors.surfaceSubtle }]}
              >
                <ThemedText type="micro" style={{ color: colors.inkMuted }}>
                  NOTE
                </ThemedText>
              </Pressable>

              {ideas.length > 0 ? (
                <Pressable
                  onPress={onTogglePicking}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="File as note on an idea"
                  style={[styles.chip, { backgroundColor: colors.surfaceSubtle }]}
                >
                  <ThemedText type="micro" style={{ color: colors.inkMuted }}>
                    NOTE ON…
                  </ThemedText>
                </Pressable>
              ) : null}

              {/* Optional detail: opens the date/horizon/project strip for a
                  dated destination. Collapsed by default so capture stays fast. */}
              <Pressable
                onPress={() =>
                  setDetailKind((k) => (k ? null : "todo"))
                }
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Add a date or project"
                style={[styles.chip, { backgroundColor: colors.surfaceSubtle }]}
              >
                <ThemedText type="micro" style={{ color: colors.inkMuted }}>
                  {detailKind ? "− DETAILS" : "+ DETAILS"}
                </ThemedText>
              </Pressable>
            </ScrollView>

            {detailKind ? (
              <View style={styles.detail}>
                {/* Which dated kind the detail applies to. */}
                <View style={styles.kindRow}>
                  {(["todo", "deadline"] as DatedKind[]).map((k) => {
                    const selected = detailKind === k;
                    return (
                      <Pressable
                        key={k}
                        onPress={() => setDetailKind(k)}
                        accessibilityRole="radio"
                        accessibilityLabel={k === "todo" ? "To-do" : "Deadline"}
                        accessibilityState={{ selected }}
                        style={[
                          styles.kindChip,
                          {
                            backgroundColor: selected
                              ? entryColor(k)
                              : colors.surfaceSubtle,
                          },
                        ]}
                      >
                        <ThemedText
                          type="micro"
                          style={{
                            color: selected ? colors.paper : colors.inkMuted,
                          }}
                        >
                          {k === "todo" ? "TODO" : "DEADLINE"}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Deadline horizon — a precise day OR a closing window. */}
                {detailKind === "deadline" ? (
                  <View style={styles.horizonRow}>
                    {(
                      [
                        { value: null, label: "Day" },
                        { value: "week", label: "Week" },
                        { value: "month", label: "Month" },
                        { value: "year", label: "Year" },
                      ] as { value: DueRange | null; label: string }[]
                    ).map((option) => {
                      const selected = dueRange === option.value;
                      return (
                        <Pressable
                          key={option.label}
                          onPress={() => setDueRange(option.value)}
                          accessibilityRole="radio"
                          accessibilityLabel={option.label}
                          accessibilityState={{ selected }}
                          style={[
                            styles.horizonOption,
                            {
                              backgroundColor: selected
                                ? detailAccent
                                : colors.surfaceSubtle,
                            },
                          ]}
                        >
                          <ThemedText
                            type="micro"
                            style={{
                              color: selected ? colors.paper : colors.inkMuted,
                            }}
                          >
                            {option.label.toUpperCase()}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                {/* Date + time — hidden for a horizon deadline (its date is the
                    window end). */}
                {!(detailKind === "deadline" && dueRange) ? (
                  <WhenPicker
                    date={date}
                    time={time}
                    onDateChange={setDate}
                    onTimeChange={setTime}
                    accentColor={detailAccent}
                    dateLabel={detailKind === "deadline" ? "DUE DATE" : "DATE"}
                  />
                ) : (
                  <ThemedText type="micro" style={{ color: colors.inkMuted }}>
                    Close it {horizonLabel(dueRange!)} — by {horizonEndDate(dueRange!)}.
                  </ThemedText>
                )}

                {/* Project attribution. */}
                {activeProjects.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.projectRow}
                  >
                    <Pressable
                      onPress={() => setProjectId(null)}
                      accessibilityRole="radio"
                      accessibilityLabel="No project"
                      accessibilityState={{ selected: projectId === null }}
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            projectId === null
                              ? detailAccent
                              : colors.surfaceSubtle,
                        },
                      ]}
                    >
                      <ThemedText
                        type="micro"
                        style={{
                          color:
                            projectId === null ? colors.paper : colors.inkMuted,
                        }}
                      >
                        UNFILED
                      </ThemedText>
                    </Pressable>
                    {activeProjects.map((p) => {
                      const selected = projectId === p.id;
                      return (
                        <Pressable
                          key={p.id}
                          onPress={() =>
                            setProjectId(selected ? null : p.id)
                          }
                          accessibilityRole="radio"
                          accessibilityLabel={`Project ${p.title}`}
                          accessibilityState={{ selected }}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: selected
                                ? detailAccent
                                : colors.surfaceSubtle,
                            },
                          ]}
                        >
                          <ThemedText
                            type="body"
                            numberOfLines={1}
                            style={[
                              styles.chipIdeaLabel,
                              { color: selected ? colors.paper : colors.ink },
                            ]}
                          >
                            {p.title}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : null}

                {/* Commit the dated entry. */}
                <Pressable
                  onPress={() => commitDated(detailKind)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    detailKind === "deadline" ? "Save deadline" : "Save to-do"
                  }
                  style={[styles.commit, { backgroundColor: detailAccent }]}
                >
                  <ThemedText type="micro" style={{ color: colors.paper }}>
                    {detailKind === "deadline" ? "SAVE DEADLINE" : "SAVE TODO"}
                  </ThemedText>
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: tokens.radius.md,
    overflow: "hidden",
    marginBottom: tokens.space.sm,
  },
  edge: {
    width: 4,
  },
  body: {
    flex: 1,
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.sm,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  echo: {
    flex: 1,
  },
  dismiss: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingRight: tokens.space.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    minHeight: 32,
    maxWidth: 200,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.pill,
  },
  chipIdeaLabel: {
    flexShrink: 1,
    fontFamily: tokens.type.fontHand.medium,
    fontSize: 18,
    lineHeight: 22,
  },
  detail: {
    gap: tokens.space.sm,
    paddingTop: tokens.space.xs,
  },
  kindRow: {
    flexDirection: "row",
    gap: tokens.space.sm,
  },
  kindChip: {
    minHeight: 32,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  horizonRow: {
    flexDirection: "row",
    gap: tokens.space.xs,
  },
  horizonOption: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.md,
  },
  projectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingRight: tokens.space.sm,
  },
  commit: {
    minHeight: 44,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
