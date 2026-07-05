import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  chipInk,
  entryColor,
  entryKicker,
  tokens,
} from "@/constants/theme";
import type { Scheme } from "@/constants/theme";
import { horizonEndDate, horizonLabel } from "@/lib/horizons";
import type { DueRange, EntryType } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function typedTextColor(type: EntryType, scheme: Scheme): string {
  return scheme === "dark" ? entryKicker(type, "light") : entryColor(type);
}

function typeIcon(type: EntryType): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (type) {
    case "deadline":
      return "calendar-clock";
    case "idea":
      return "lightbulb-on-outline";
    case "todo":
      return "checkbox-marked-circle-outline";
  }
}

// ---------------------------------------------------------------------------
// StageHeader — back / label / commit-or-discard bar
// ---------------------------------------------------------------------------

export function StageHeader({
  label,
  onBack,
  onDiscard,
  onCommit,
  ink,
  muted,
  accent,
}: {
  label: string;
  onBack: () => void;
  onDiscard: () => void;
  onCommit?: () => void;
  ink: string;
  muted: string;
  accent?: string;
}): React.ReactElement {
  return (
    <View style={styles.stageHeader}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={styles.headerButton}
      >
        <IconSymbol name="chevron-left" size={18} color={muted} />
      </Pressable>
      <ThemedText type="label" style={[styles.stageLabel, { color: muted }]}>
        {label}
      </ThemedText>
      {onCommit ? (
        <Pressable
          onPress={onCommit}
          accessibilityRole="button"
          accessibilityLabel="Save"
          style={styles.headerButton}
        >
          <IconSymbol name="check" size={18} color={accent ?? ink} />
        </Pressable>
      ) : (
        <Pressable
          onPress={onDiscard}
          accessibilityRole="button"
          accessibilityLabel="Discard"
          style={styles.headerButton}
        >
          <IconSymbol name="close" size={16} color={muted} />
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// TypeLane — single classification tile (handles EntryType + "note" variant)
// ---------------------------------------------------------------------------

function TypeLane({
  variant,
  label,
  caption,
  scheme,
  ink,
  muted,
  raised,
  onPress,
}: {
  variant: EntryType | "note";
  label: string;
  caption: string;
  scheme: Scheme;
  ink: string;
  muted: string;
  raised: string;
  onPress: () => void;
}): React.ReactElement {
  const isNote = variant === "note";
  const color = isNote ? muted : entryColor(variant);
  const kicker = isNote ? ink : typedTextColor(variant, scheme);
  const icon = isNote
    ? ("note-text-outline" as keyof typeof MaterialCommunityIcons.glyphMap)
    : typeIcon(variant);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`File as ${label}`}
      style={({ pressed }) => [
        styles.typeLane,
        { backgroundColor: raised },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.typeBar, { backgroundColor: color }]} />
      <View style={styles.typeCopy}>
        <ThemedText type="bodyBold" style={{ color: kicker }}>
          {label}
        </ThemedText>
        <ThemedText type="caption" numberOfLines={1} style={{ color: muted }}>
          {caption}
        </ThemedText>
      </View>
      <MaterialCommunityIcons name={icon} size={16} color={color} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// OptionRow / OptionChip — horizontal chip rail
// ---------------------------------------------------------------------------

function OptionRow({
  label,
  muted,
  children,
}: {
  label: string;
  muted: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <View style={styles.optionRow}>
      <ThemedText type="micro" style={[styles.optionLabel, { color: muted }]}>
        {label}
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.optionRail}
      >
        {children}
      </ScrollView>
    </View>
  );
}

function OptionChip({
  label,
  selected,
  color,
  muted,
  raised,
  onPress,
}: {
  label: string;
  selected: boolean;
  color: string;
  muted: string;
  raised: string;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.optionChip,
        { backgroundColor: selected ? color : raised },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        type="mono"
        numberOfLines={1}
        style={{ color: selected ? chipInk() : muted }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// ExactInline — date + time text inputs
// ---------------------------------------------------------------------------

function ExactInline({
  date,
  time,
  color,
  muted,
  raised,
  onDateChange,
  onTimeChange,
}: {
  date: string;
  time: string;
  color: string;
  muted: string;
  raised: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}): React.ReactElement {
  return (
    <View style={styles.exactInline}>
      <TextInput
        value={date}
        onChangeText={onDateChange}
        placeholder="DD/MM/YYYY"
        placeholderTextColor={muted}
        selectionColor={color}
        keyboardType="numbers-and-punctuation"
        accessibilityLabel="Exact date"
        style={[styles.exactInput, { color, backgroundColor: raised }]}
      />
      <TextInput
        value={time}
        onChangeText={onTimeChange}
        placeholder="HH:MM"
        placeholderTextColor={muted}
        selectionColor={color}
        keyboardType="numbers-and-punctuation"
        accessibilityLabel="Exact time"
        style={[
          styles.exactInput,
          styles.timeInput,
          { color, backgroundColor: raised },
        ]}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Stage views — each renders the content for one stage of the flow
// ---------------------------------------------------------------------------

export interface ClassifyStageViewProps {
  scheme: Scheme;
  ink: string;
  muted: string;
  raised: string;
  onBack: () => void;
  onDiscard: () => void;
  onSelectType: (type: EntryType | "note") => void;
}

export function ClassifyStageView({
  scheme,
  ink,
  muted,
  raised,
  onBack,
  onDiscard,
  onSelectType,
}: ClassifyStageViewProps): React.ReactElement {
  return (
    <View style={styles.classifyStage}>
      <StageHeader
        label="File it as"
        onBack={onBack}
        onDiscard={onDiscard}
        ink={ink}
        muted={muted}
      />
      <View style={styles.typeGrid}>
        <TypeLane
          variant="idea"
          label="Idea"
          caption="keep it alive"
          scheme={scheme}
          ink={ink}
          muted={muted}
          raised={raised}
          onPress={() => onSelectType("idea")}
        />
        <TypeLane
          variant="todo"
          label="Todo"
          caption="make it actionable"
          scheme={scheme}
          ink={ink}
          muted={muted}
          raised={raised}
          onPress={() => onSelectType("todo")}
        />
        <TypeLane
          variant="deadline"
          label="Deadline"
          caption="give it a horizon"
          scheme={scheme}
          ink={ink}
          muted={muted}
          raised={raised}
          onPress={() => onSelectType("deadline")}
        />
        <TypeLane
          variant="note"
          label="Note"
          caption="diary trace"
          scheme={scheme}
          ink={ink}
          muted={muted}
          raised={raised}
          onPress={() => onSelectType("note")}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Details stage
// ---------------------------------------------------------------------------

type DatedKind = "todo" | "deadline";

type WhenOption =
  | { kind: "concrete"; label: string; date: () => string }
  | { kind: "horizon"; label: string; range: DueRange };

const WHEN_OPTIONS: WhenOption[] = [
  { kind: "concrete", label: "a day", date: () => dateStr(0) },
  { kind: "concrete", label: "weekend", date: () => dateStr(daysToWeekend()) },
  { kind: "horizon", label: "this week", range: "week" },
  { kind: "horizon", label: "this month", range: "month" },
  { kind: "horizon", label: "this year", range: "year" },
];

export interface DetailsStageViewProps {
  selected: DatedKind;
  accent: string;
  muted: string;
  raised: string;
  quiet: string;
  ink: string;
  scheme: Scheme;
  exact: boolean;
  setExact: (f: (prev: boolean) => boolean) => void;
  date: string;
  setDate: (v: string) => void;
  time: string;
  setTime: (v: string) => void;
  dueRange: DueRange | null;
  setDueRange: (v: DueRange | null) => void;
  projectId: string | null;
  setProjectId: (v: ((prev: string | null) => string | null) | string | null) => void;
  activeProjects: { id: string; title: string }[];
  lockedProjectId: string | null;
  projectName: string;
  onBack: () => void;
  onDiscard: () => void;
  onCommit: () => void;
}

export function DetailsStageView({
  selected,
  accent,
  muted,
  raised,
  quiet,
  ink,
  scheme,
  exact,
  setExact,
  date,
  setDate,
  time,
  setTime,
  dueRange,
  setDueRange,
  projectId,
  setProjectId,
  activeProjects,
  lockedProjectId,
  projectName,
  onBack,
  onDiscard,
  onCommit,
}: DetailsStageViewProps): React.ReactElement {
  return (
    <View style={styles.detailStage}>
      <StageHeader
        label={selected === "deadline" ? "Deadline" : "Todo"}
        onBack={onBack}
        onDiscard={onDiscard}
        onCommit={onCommit}
        ink={ink}
        muted={muted}
        accent={accent}
      />
      <View style={styles.detailStack}>
        <OptionRow label="WHEN" muted={muted}>
          {WHEN_OPTIONS.map((option) =>
            option.kind === "concrete" ? (
              <OptionChip
                key={option.label}
                label={option.label}
                selected={
                  !exact && dueRange === null && date === option.date()
                }
                color={accent}
                muted={muted}
                raised={quiet}
                onPress={() => {
                  setExact(() => false);
                  setDueRange(null);
                  setDate(option.date());
                  setTime("");
                }}
              />
            ) : (
              <OptionChip
                key={option.label}
                label={option.label}
                selected={!exact && dueRange === option.range}
                color={accent}
                muted={muted}
                raised={quiet}
                onPress={() => {
                  setExact(() => false);
                  setDueRange(option.range);
                  setDate("");
                  setTime("");
                }}
              />
            ),
          )}
          <OptionChip
            label="exact"
            selected={exact}
            color={accent}
            muted={muted}
            raised={quiet}
            onPress={() => {
              setExact((v) => !v);
              setDueRange(null);
            }}
          />
        </OptionRow>

        {exact ? (
          <ExactInline
            date={date}
            time={time}
            color={accent}
            muted={muted}
            raised={quiet}
            onDateChange={setDate}
            onTimeChange={setTime}
          />
        ) : dueRange ? (
          <ThemedText type="micro" style={{ color: muted }}>
            {selected === "deadline" ? "Close it" : "Land it"}{" "}
            {horizonLabel(dueRange)} · {horizonEndDate(dueRange)}
          </ThemedText>
        ) : null}

        {!lockedProjectId && activeProjects.length > 0 ? (
          <OptionRow label="PROJECT" muted={muted}>
            <OptionChip
              label="unfiled"
              selected={projectId === null}
              color={accent}
              muted={muted}
              raised={quiet}
              onPress={() => setProjectId(null)}
            />
            {activeProjects.map((project) => (
              <OptionChip
                key={project.id}
                label={project.title}
                selected={projectId === project.id}
                color={accent}
                muted={muted}
                raised={quiet}
                onPress={() =>
                  setProjectId((id) =>
                    id === project.id ? null : project.id,
                  )
                }
              />
            ))}
          </OptionRow>
        ) : null}

        <View style={styles.commitReadout}>
          <View
            style={[
              styles.commitDot,
              { backgroundColor: entryColor(selected) },
            ]}
          />
          <ThemedText type="mono" style={{ color: muted }}>
            {projectName}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Note-link stage
// ---------------------------------------------------------------------------

export interface NoteLinkStageViewProps {
  ink: string;
  muted: string;
  raised: string;
  quiet: string;
  recentIdeas: { id: string; title: string }[];
  onBack: () => void;
  onDiscard: () => void;
  onFileFree: () => void;
  onFileOnIdea: (entryId: string) => void;
}

export function NoteLinkStageView({
  ink,
  muted,
  raised,
  quiet,
  recentIdeas,
  onBack,
  onDiscard,
  onFileFree,
  onFileOnIdea,
}: NoteLinkStageViewProps): React.ReactElement {
  return (
    <View style={styles.detailStage}>
      <StageHeader
        label="Note"
        onBack={onBack}
        onDiscard={onDiscard}
        ink={ink}
        muted={muted}
      />
      <View style={styles.noteChoices}>
        <Pressable
          onPress={onFileFree}
          accessibilityRole="button"
          accessibilityLabel="File as free note"
          style={({ pressed }) => [
            styles.freeNote,
            { backgroundColor: raised },
            pressed && styles.pressed,
          ]}
        >
          <IconSymbol name="note-text-outline" size={14} color={ink} />
          <ThemedText type="bodyBold" style={{ color: ink }}>
            Free note
          </ThemedText>
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.ideaRail}
        >
          {recentIdeas.map((idea) => (
            <Pressable
              key={idea.id}
              onPress={() => onFileOnIdea(idea.id)}
              accessibilityRole="button"
              accessibilityLabel={`Note on idea: ${idea.title}`}
              style={({ pressed }) => [
                styles.ideaChip,
                { backgroundColor: quiet },
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[styles.ideaDot, { backgroundColor: entryColor("idea") }]}
              />
              <ThemedText
                type="body"
                numberOfLines={1}
                style={[styles.ideaLabel, { color: ink }]}
              >
                {idea.title}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers used by WHEN_OPTIONS
// ---------------------------------------------------------------------------

function dateStr(addDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + addDays);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function daysToWeekend(): number {
  const day = new Date().getDay();
  return (6 - day + 7) % 7;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

export const stageViewStyles = StyleSheet.create({
  classifyStage: {
    paddingHorizontal: tokens.space.sm,
    paddingTop: 6,
    paddingBottom: tokens.space.sm,
    gap: tokens.space.xs,
  },
  detailStage: {
    paddingHorizontal: tokens.space.sm,
    paddingTop: 6,
    paddingBottom: tokens.space.sm,
    gap: tokens.space.xs,
  },
  stageHeader: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
  headerButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  stageLabel: {
    flex: 1,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.xs,
  },
  typeLane: {
    width: "48.7%",
    minHeight: 54,
    borderRadius: tokens.radius.sm,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    paddingRight: tokens.space.xs,
  },
  typeBar: {
    width: 3,
    alignSelf: "stretch",
  },
  typeCopy: {
    flex: 1,
    paddingLeft: tokens.space.sm,
    paddingRight: tokens.space.xs,
    gap: 1,
  },
  detailStack: {
    gap: tokens.space.xs,
  },
  optionRow: {
    gap: 2,
  },
  optionLabel: {
    paddingLeft: 2,
  },
  optionRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingRight: tokens.space.sm,
  },
  optionChip: {
    minHeight: 28,
    maxWidth: 160,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  exactInline: {
    flexDirection: "row",
    gap: tokens.space.xs,
  },
  exactInput: {
    flex: 1,
    minHeight: 32,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.sm,
    fontFamily: tokens.type.fontMono.medium,
    fontSize: tokens.type.mono.size,
    lineHeight: tokens.type.mono.lineHeight,
  },
  timeInput: {
    flex: 0.56,
  },
  commitReadout: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingLeft: 2,
  },
  commitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  noteChoices: {
    gap: tokens.space.xs,
  },
  freeNote: {
    minHeight: 36,
    borderRadius: tokens.radius.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.sm,
  },
  ideaRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingRight: tokens.space.sm,
  },
  ideaChip: {
    minHeight: 34,
    maxWidth: 200,
    borderRadius: tokens.radius.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.sm,
  },
  ideaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ideaLabel: {
    maxWidth: 160,
  },
  pressed: {
    opacity: 0.62,
  },
});

const styles = stageViewStyles;
