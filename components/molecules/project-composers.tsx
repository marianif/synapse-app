import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import DateInput from "@/components/atoms/DateInput";
import TimeInput from "@/components/atoms/TimeInput";
import { ThemedText } from "@/components/atoms/themed-text";
import { ProjectEntryComposerSheet } from "@/components/molecules/project-entry-composer-sheet";
import { entryColor, tokens, useTheme } from "@/constants/theme";
import { horizonEndDate } from "@/lib/horizons";

import type { CreateEntryInput } from "@/contexts/database-context";
import type { DueRange } from "@/lib/types";

/**
 * The three project-scoped entry composers — thin wrappers around the shared
 * ProjectEntryComposerSheet that each contribute their own type-specific
 * picker section (or no picker, for ideas).
 *
 * Each composer fires onSave with a partial CreateEntryInput — the parent
 * fills in `type` and `projectId` and calls createEntry. This keeps the
 * composers ignorant of the project context beyond the title shown in the
 * kicker (DI through props, not coupling to useDatabase here).
 */

// ─── IDEA ────────────────────────────────────────────────────────────────────

export function ProjectIdeaComposerSheet({
  visible,
  projectTitle,
  onClose,
  onSave,
}: {
  visible: boolean;
  projectTitle: string;
  onClose: () => void;
  onSave: (input: Pick<CreateEntryInput, "title">) => void;
}): React.ReactElement {
  return (
    <ProjectEntryComposerSheet
      visible={visible}
      projectTitle={projectTitle}
      typeLabel="IDEA"
      accentColor={entryColor("idea")}
      placeholder="What's the thought?"
      canSave={true}
      onClose={onClose}
      onSave={(title) => onSave({ title })}
    />
  );
}

// ─── TODO ────────────────────────────────────────────────────────────────────

export function ProjectTodoComposerSheet({
  visible,
  projectTitle,
  onClose,
  onSave,
}: {
  visible: boolean;
  projectTitle: string;
  onClose: () => void;
  onSave: (
    input: Pick<CreateEntryInput, "title" | "scheduledDate" | "scheduledTime">,
  ) => void;
}): React.ReactElement {
  // Two local fields. Both optional — a dateless todo is a "someday" todo,
  // which is a first-class state per PRODUCT.md (the SOMEDAY badge).
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [whenOpen, setWhenOpen] = useState(false);

  // Reset whenever the sheet mounts — stale "when" from a prior cancelled
  // capture would leak across sessions.
  useEffect(() => {
    if (visible) {
      setDate("");
      setTime("");
      setWhenOpen(false);
    }
  }, [visible]);

  return (
    <ProjectEntryComposerSheet
      visible={visible}
      projectTitle={projectTitle}
      typeLabel="TO-DO"
      accentColor={entryColor("todo")}
      placeholder="What needs doing?"
      canSave={true} // date/time both optional → only title gates Save
      onClose={onClose}
      onSave={(title) =>
        onSave({
          title,
          scheduledDate: date.trim() || undefined,
          scheduledTime: time.trim() || undefined,
        })
      }
      pickerSlot={
        <WhenSlot
          open={whenOpen}
          onToggle={() => setWhenOpen((v) => !v)}
          summary={summarizeWhen(date, time)}
          accentColor={entryColor("todo")}
        >
          <View style={styles.whenRow}>
            <View style={styles.whenField}>
              <ThemedText type="micro" muted style={styles.whenLabel}>
                DATE
              </ThemedText>
              <DateInput value={date} onChange={setDate} />
            </View>
            <View style={styles.whenField}>
              <ThemedText type="micro" muted style={styles.whenLabel}>
                TIME
              </ThemedText>
              <TimeInput value={time} onChange={setTime} />
            </View>
          </View>
        </WhenSlot>
      }
    />
  );
}

// ─── DEADLINE ────────────────────────────────────────────────────────────────

const HORIZON_OPTIONS: { label: string; value: DueRange | null }[] = [
  { label: "Day", value: null },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];

export function ProjectDeadlineComposerSheet({
  visible,
  projectTitle,
  onClose,
  onSave,
}: {
  visible: boolean;
  projectTitle: string;
  onClose: () => void;
  onSave: (
    input: Pick<CreateEntryInput, "title" | "dueDate" | "dueRange">,
  ) => void;
}): React.ReactElement {
  // Mirrors the resolver's grammar: a deadline either commits to a precise
  // day (horizon = null + a typed date) or a closing window (week/month/year,
  // dueDate then becomes the window's end via horizonEndDate).
  const [horizon, setHorizon] = useState<DueRange | null>(null);
  const [date, setDate] = useState("");

  useEffect(() => {
    if (visible) {
      setHorizon(null);
      setDate("");
    }
  }, [visible]);

  // Day-mode needs a date; horizon-mode auto-resolves to the window end.
  const needsExplicitDate = horizon === null;
  const canSave = needsExplicitDate ? date.trim().length > 0 : true;

  return (
    <ProjectEntryComposerSheet
      visible={visible}
      projectTitle={projectTitle}
      typeLabel="DEADLINE"
      accentColor={entryColor("deadline")}
      placeholder="What's due?"
      canSave={canSave}
      onClose={onClose}
      onSave={(title) =>
        onSave({
          title,
          dueDate: horizon ? horizonEndDate(horizon) : date.trim() || undefined,
          dueRange: horizon ?? undefined,
        })
      }
      pickerSlot={
        <View style={styles.deadlineBlock}>
          <View style={styles.horizonRow}>
            {HORIZON_OPTIONS.map((opt) => {
              const selected = horizon === opt.value;
              return (
                <Pressable
                  key={opt.label}
                  onPress={() => setHorizon(opt.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={opt.label}
                  style={({ pressed }) => [
                    styles.horizonOption,
                    {
                      backgroundColor: selected
                        ? entryColor("deadline")
                        : "transparent",
                      borderColor: selected
                        ? entryColor("deadline")
                        : tokens.color.scrim.shadow + "20",
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <SelectedAwareLabel selected={selected}>
                    {opt.label}
                  </SelectedAwareLabel>
                </Pressable>
              );
            })}
          </View>
          {horizon === null ? (
            <DateInput value={date} onChange={setDate} />
          ) : (
            <HorizonHint horizon={horizon} />
          )}
        </View>
      }
    />
  );
}

// ─── Small helpers (used only by these composers) ───────────────────────────

function WhenSlot({
  open,
  onToggle,
  summary,
  accentColor,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  summary: string;
  accentColor: string;
  children: React.ReactNode;
}): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View style={styles.whenBlock}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={open ? "Hide when" : "Set when"}
        style={({ pressed }) => [styles.whenToggle, pressed && styles.pressed]}
      >
        <ThemedText
          type="micro"
          style={[styles.whenLabel, { color: accentColor }]}
        >
          WHEN
        </ThemedText>
        <ThemedText type="body" style={{ flex: 1, color: colors.inkMuted }}>
          {summary}
        </ThemedText>
        <ThemedText type="micro" style={{ color: colors.inkMuted }}>
          {open ? "HIDE" : "SET"}
        </ThemedText>
      </Pressable>
      {open ? children : null}
    </View>
  );
}

function summarizeWhen(date: string, time: string): string {
  if (!date && !time) return "Someday";
  if (date && time) return `${date} · ${time}`;
  return date || time;
}

function HorizonHint({ horizon }: { horizon: DueRange }): React.ReactElement {
  const { colors } = useTheme();
  return (
    <ThemedText type="caption" style={{ color: colors.inkMuted }}>
      Close it {horizonLabelWord(horizon)} — by {horizonEndDate(horizon)}.
    </ThemedText>
  );
}

function horizonLabelWord(horizon: DueRange): string {
  switch (horizon) {
    case "week":
      return "this week";
    case "month":
      return "this month";
    case "year":
      return "this year";
  }
}

function SelectedAwareLabel({
  selected,
  children,
}: {
  selected: boolean;
  children: string;
}): React.ReactElement {
  const { colors } = useTheme();
  return (
    <ThemedText
      type="caption"
      style={{
        color: selected ? colors.paper : colors.inkMuted,
        fontWeight: selected ? "700" : "600",
      }}
    >
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  // When-slot (todo composer) — collapsed toggle row + expanded pickers.
  whenBlock: { gap: tokens.space.sm },
  whenToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingVertical: tokens.space.xs,
  },
  whenLabel: {
    letterSpacing: tokens.type.micro.tracking,
  },
  whenRow: {
    flexDirection: "row",
    gap: tokens.space.sm,
  },
  whenField: { flex: 1, gap: tokens.space.xs },

  // Deadline horizon pills.
  deadlineBlock: { gap: tokens.space.sm },
  horizonRow: {
    flexDirection: "row",
    gap: tokens.space.xs,
  },
  horizonOption: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    paddingHorizontal: tokens.space.xs,
  },
  pressed: { opacity: 0.7 },
});
