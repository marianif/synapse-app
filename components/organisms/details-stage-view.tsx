import { StyleSheet, View } from "react-native";

import { OptionChip } from "@/components/atoms/option-chip";
import { ThemedText } from "@/components/atoms/themed-text";
import { ExactInline } from "@/components/molecules/exact-inline";
import { OptionRow } from "@/components/molecules/option-row";
import { StageHeader } from "@/components/molecules/stage-header";
import type { Scheme } from "@/constants/theme";
import { entryColor, tokens } from "@/constants/theme";
import { horizonEndDate, horizonLabel } from "@/lib/horizons";
import type { DueRange } from "@/lib/types";

type DatedKind = "todo" | "deadline";

type WhenOption =
  | { kind: "concrete"; label: string; date: () => string }
  | { kind: "horizon"; label: string; range: DueRange };

const WHEN_OPTIONS: WhenOption[] = [
  { kind: "concrete", label: "tomorrow", date: () => dateStr(1) },
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
  setProjectId: (
    v: ((prev: string | null) => string | null) | string | null,
  ) => void;
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
  quiet,
  ink,
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
                selected={!exact && dueRange === null && date === option.date()}
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
                  setProjectId((id) => (id === project.id ? null : project.id))
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

const styles = StyleSheet.create({
  detailStage: {
    paddingHorizontal: tokens.space.sm,
    paddingTop: 6,
    paddingBottom: tokens.space.sm,
    gap: tokens.space.xs,
  },
  detailStack: {
    gap: tokens.space.xs,
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
});
