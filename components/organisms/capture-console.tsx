import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut, useReducedMotion } from "react-native-reanimated";

import { ExactDateMenu } from "@/components/organisms/exact-date-menu";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import {
  entryKicker,
  entryTint,
  tokens,
  useTheme,
} from "@/constants/theme";
import { useUiPreference } from "@/hooks/use-ui-preference";
import type { UseCaptureReturn } from "@/hooks/use-capture";
import { horizonEndDate, horizonLabel } from "@/lib/horizons";
import type { DbProject, DueRange, EntryType } from "@/lib/types";
import type { InputStageHandle } from "@/components/organisms/input-stage-view";
import { DockShell } from "@/components/organisms/dock-shell";

type CaptureKind = EntryType | "note";
type ContextMenu = "kind" | "project" | "when" | "more" | null;
type DatedKind = "todo" | "deadline";

type WhenOption =
  | { kind: "concrete"; label: string; icon: IconSymbolName; date: () => string }
  | { kind: "horizon"; label: string; icon: IconSymbolName; range: DueRange };

const LAST_KIND_KEY = "capture.last-kind";
const FIRST_CAPTURE_KIND: CaptureKind = "todo";

const WHEN_OPTIONS: WhenOption[] = [
  {
    kind: "concrete",
    label: "tomorrow",
    icon: "CalendarDay",
    date: () => dateStr(1),
  },
  {
    kind: "concrete",
    label: "weekend",
    icon: "Moon",
    date: () => dateStr(daysToWeekend()),
  },
  { kind: "horizon", label: "this week", icon: "Calendar", range: "week" },
  { kind: "horizon", label: "this month", icon: "Calendar2", range: "month" },
  { kind: "horizon", label: "this year", icon: "Infinite", range: "year" },
];

function isCaptureKind(value: string | null): value is CaptureKind {
  return (
    value === "idea" ||
    value === "todo" ||
    value === "deadline" ||
    value === "note"
  );
}

function isDatedKind(kind: CaptureKind): kind is DatedKind {
  return kind === "todo" || kind === "deadline";
}

function kindLabel(kind: CaptureKind): string {
  if (kind === "deadline") return "Deadline";
  return kind[0].toUpperCase() + kind.slice(1);
}

function kindIcon(kind: CaptureKind): IconSymbolName {
  switch (kind) {
    case "idea":
      return "Sparkles";
    case "todo":
      return "CheckSquare";
    case "deadline":
      return "Clock";
    case "note":
      return "Note2";
  }
}

export interface CaptureConsoleProps {
  cap: UseCaptureReturn;
  projects: DbProject[];
}

/**
 * A no-stage alternative to CaptureComposer. The thought stays in one panel;
 * filing choices appear as contextual chips above the action rail instead of
 * moving the user through a horizontal stage track.
 */
export const CaptureConsole = forwardRef<
  InputStageHandle,
  CaptureConsoleProps
>(function CaptureConsole({ cap, projects }, ref): React.ReactElement | null {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const inputRef = useRef<TextInput | null>(null);
  const whenAnchorRef = useRef<View | null>(null);

  const [lastKind, setLastKind, preferenceLoaded] = useUiPreference(
    LAST_KIND_KEY,
    FIRST_CAPTURE_KIND,
    isCaptureKind,
  );
  const [kind, setKind] = useState<CaptureKind>(FIRST_CAPTURE_KIND);
  const [kindTouched, setKindTouched] = useState(false);
  const [draft, setDraft] = useState("");
  const [projectId, setProjectId] = useState<string | null>(
    cap.lockedProjectId,
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [dueRange, setDueRange] = useState<DueRange | null>(null);
  const [exact, setExact] = useState(false);
  const [menu, setMenu] = useState<ContextMenu>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const activeProjects = projects.filter((project) => project.status === "active");
  const pendingThought = cap.pendingThought;
  const hasDraft = draft.trim().length > 0;
  const hasThought = pendingThought !== null;
  const projectName =
    projectId === null
      ? "Unfiled"
      : (activeProjects.find((project) => project.id === projectId)?.title ??
        "Unfiled");
  const lockedProjectName =
    cap.lockedProjectId === null
      ? null
      : (activeProjects.find((project) => project.id === cap.lockedProjectId)
          ?.title ?? "Project");
  const displayedProject = lockedProjectName ?? projectName;

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  // The scoped project composer can seed a dated kind before any text exists.
  // Otherwise the console follows the last successfully filed kind.
  useEffect(() => {
    if (pendingThought !== null || cap.isRecording) return;
    if (cap.seedType === "todo" || cap.seedType === "deadline") {
      setKind(cap.seedType);
      setKindTouched(true);
      return;
    }
    if (preferenceLoaded && !kindTouched) setKind(lastKind);
  }, [
    cap.isRecording,
    cap.seedType,
    kindTouched,
    lastKind,
    pendingThought,
    preferenceLoaded,
  ]);

  useEffect(() => {
    if (cap.lockedProjectId !== null) setProjectId(cap.lockedProjectId);
  }, [cap.lockedProjectId]);

  const resetTransient = (nextKind: CaptureKind = lastKind): void => {
    setDraft("");
    setKind(nextKind);
    setKindTouched(false);
    setProjectId(cap.lockedProjectId);
    setDate("");
    setTime("");
    setDueRange(null);
    setExact(false);
    setMenu(null);
    setDatePickerOpen(false);
    setAnchorRect(null);
  };

  const submitDraft = (): void => {
    if (!hasDraft) return;
    cap.capture(draft.trim());
    setDraft("");
    setMenu(null);
  };

  const closeEmpty = (): void => {
    if (!hasDraft && !hasThought) {
      cap.setComposerOpen(false);
      resetTransient();
    }
  };

  const discard = (): void => {
    cap.dismissPending();
    cap.setComposerOpen(false);
    resetTransient();
  };

  const selectKind = (nextKind: CaptureKind): void => {
    setKind(nextKind);
    setKindTouched(true);
    setMenu(null);
    if (!isDatedKind(nextKind)) {
      setDate("");
      setTime("");
      setDueRange(null);
      setExact(false);
    }
  };

  const selectProject = (nextProjectId: string | null): void => {
    setProjectId(nextProjectId);
    setMenu(null);
  };

  const openExactDate = (): void => {
    setMenu(null);
    setExact(true);
    setDueRange(null);
    whenAnchorRef.current?.measureInWindow((x, y, w, h) => {
      setAnchorRect({ x, y, w, h });
      setDatePickerOpen(true);
    });
  };

  const selectWhen = (option: WhenOption): void => {
    if (option.kind === "concrete") {
      setExact(false);
      setDueRange(null);
      setDate(option.date());
      setTime("");
      setMenu(null);
      return;
    }
    setExact(false);
    setDueRange(option.range);
    setDate("");
    setTime("");
    setMenu(null);
  };

  const commit = (): void => {
    if (!hasThought) return;

    setLastKind(kind);
    if (kind === "idea") {
      cap.resolveCapture({
        kind: "idea",
        projectId: projectId ?? undefined,
      });
    } else if (kind === "note") {
      cap.resolveCapture({
        kind: "note",
        projectId: projectId ?? undefined,
      });
    } else if (kind === "deadline") {
      cap.resolveCapture({
        kind: "deadline",
        dueDate: dueRange ? horizonEndDate(dueRange) : date.trim() || undefined,
        dueTime: dueRange ? undefined : time.trim() || undefined,
        dueRange: dueRange ?? undefined,
        projectId: projectId ?? undefined,
      });
    } else {
      cap.resolveCapture({
        kind: "todo",
        scheduledDate: dueRange
          ? horizonEndDate(dueRange)
          : date.trim() || undefined,
        scheduledTime: dueRange ? undefined : time.trim() || undefined,
        projectId: projectId ?? undefined,
      });
    }
    cap.setComposerOpen(false);
    resetTransient(kind);
  };

  const openMenu = (nextMenu: Exclude<ContextMenu, null>): void => {
    if (cap.isRecording) return;
    setMenu((current) => (current === nextMenu ? null : nextMenu));
  };

  const menuEntering = reduced
    ? undefined
    : FadeIn.duration(tokens.motion.duration.fast);
  const menuExiting = reduced
    ? undefined
    : FadeOut.duration(tokens.motion.duration.fast);

  if (
    !cap.composerOpen &&
    !cap.isRecording &&
    cap.pendingThought === null &&
    !cap.dockAlwaysVisible
  ) {
    return null;
  }

  const actionLabel = cap.isRecording
    ? "Done"
    : hasThought
      ? "File"
      : hasDraft
        ? "Continue"
        : "Speak";

  return (
    <DockShell
      register="surface"
      contentKey="capture-console"
      radius={tokens.radius.lg}
    >
      <View style={styles.console}>
        {menu ? (
          <Animated.View
            entering={menuEntering}
            exiting={menuExiting}
            style={[styles.menu, { backgroundColor: colors.surfaceSubtle }]}
          >
            {renderMenu({
              menu,
              kind,
              projectId,
              activeProjects,
              dateLabel: whenLabel(exact, date, time, dueRange),
              muted: colors.inkMuted,
              scheme,
              onSelectKind: selectKind,
              onSelectProject: selectProject,
              onSelectWhen: selectWhen,
              onOpenExactDate: openExactDate,
              onOpenMenu: openMenu,
            })}
          </Animated.View>
        ) : null}

        <View style={styles.thoughtRow}>
          <View style={styles.signalMark}>
            <IconSymbol
              name={cap.isRecording ? "Microphone" : "Pen"}
              size={18}
              color={colors.inkMuted}
            />
          </View>
          {cap.isRecording ? (
            <View style={styles.readout}>
              <Text style={[styles.kicker, { color: colors.inkMuted }]}>LISTENING</Text>
              <Text
                style={[styles.readoutText, { color: colors.ink }]}
                numberOfLines={2}
              >
                {cap.transcript || "Speak your thought"}
              </Text>
            </View>
          ) : hasThought ? (
            <View style={styles.readout}>
              <Text style={[styles.kicker, { color: colors.inkMuted }]}>THOUGHT</Text>
              <Text
                style={[styles.readoutText, { color: colors.ink }]}
                numberOfLines={2}
              >
                {pendingThought}
              </Text>
            </View>
          ) : (
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={submitDraft}
              onBlur={closeEmpty}
              placeholder="Put something in"
              placeholderTextColor={colors.inkMuted}
              selectionColor={colors.ink}
              returnKeyType="done"
              submitBehavior="submit"
              accessibilityLabel="Put something in"
              multiline
              style={[styles.input, { color: colors.ink }]}
            />
          )}
          {hasThought ? (
            <Pressable
              onPress={discard}
              accessibilityRole="button"
              accessibilityLabel="Discard capture"
              hitSlop={8}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <IconSymbol name="X" size={18} color={colors.inkMuted} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.rail}>
          <ScrollView
            horizontal
            style={styles.contextScroll}
            contentContainerStyle={styles.contextRail}
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable
              onPress={() => openMenu("more")}
              accessibilityRole="button"
              accessibilityLabel="Add capture detail"
              accessibilityState={{ disabled: cap.isRecording }}
              disabled={cap.isRecording}
              hitSlop={4}
              style={({ pressed }) => [
                styles.plusButton,
                { backgroundColor: colors.surfaceSubtle },
                pressed && styles.pressed,
                cap.isRecording && styles.disabled,
              ]}
            >
              <IconSymbol name="Plus" size={18} color={colors.ink} />
            </Pressable>

            <ContextChip
              label={kindLabel(kind)}
              icon={kindIcon(kind)}
              semanticKind={kind}
              scheme={scheme}
              onPress={() => openMenu("kind")}
              disabled={cap.isRecording}
            />

            <ContextChip
              label={displayedProject}
              icon="Folder"
              scheme={scheme}
              onPress={() => openMenu("project")}
              disabled={cap.isRecording || cap.lockedProjectId !== null}
            />

            {isDatedKind(kind) ? (
              <View ref={whenAnchorRef} collapsable={false}>
                <ContextChip
                  label={whenLabel(exact, date, time, dueRange)}
                  icon="Calendar"
                  scheme={scheme}
                  onPress={() => openMenu("when")}
                  disabled={cap.isRecording}
                />
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.actionGroup}>
            {cap.isRecording ? (
              <>
                <RailAction
                  label="Cancel"
                  icon="X"
                  onPress={() => void cap.cancelRecording()}
                  muted
                />
                <RailAction
                  label={actionLabel}
                  icon="ArrowRight"
                  onPress={() => void cap.stopRecording()}
                />
              </>
            ) : (
              <RailAction
                label={actionLabel}
                icon={hasThought ? "Check" : hasDraft ? "ArrowRight" : "Microphone"}
                onPress={hasThought ? commit : hasDraft ? submitDraft : cap.startRecording}
              />
            )}
          </View>
        </View>
      </View>

      <ExactDateMenu
        visible={datePickerOpen}
        initialDate={date}
        initialTime={time}
        accentColor={entryKicker(kind === "deadline" ? "deadline" : "todo", scheme)}
        anchor={anchorRect}
        onDismiss={() => {
          setDatePickerOpen(false);
          setAnchorRect(null);
        }}
        onConfirm={(nextDate, nextTime) => {
          setExact(true);
          setDate(nextDate);
          setTime(nextTime);
          setDueRange(null);
          setDatePickerOpen(false);
          setAnchorRect(null);
        }}
      />
    </DockShell>
  );
});

function ContextChip({
  label,
  icon,
  semanticKind,
  scheme,
  onPress,
  disabled = false,
}: {
  label: string;
  icon: IconSymbolName;
  semanticKind?: CaptureKind;
  scheme: "light" | "dark";
  onPress: () => void;
  disabled?: boolean;
}): React.ReactElement {
  const { colors } = useTheme();
  const semantic =
    semanticKind && semanticKind !== "note"
      ? {
          backgroundColor: entryTint(semanticKind, scheme),
          color: entryKicker(semanticKind, scheme),
        }
      : {
          backgroundColor: colors.surfaceSubtle,
          color: colors.ink,
        };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.contextChip,
        { backgroundColor: semantic.backgroundColor },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <IconSymbol name={icon} size={14} color={semantic.color} />
      <Text style={[styles.contextChipLabel, { color: semantic.color }]} numberOfLines={1}>
        {label}
      </Text>
      {!disabled ? <IconSymbol name="ChevronDown" size={13} color={semantic.color} /> : null}
    </Pressable>
  );
}

function RailAction({
  label,
  icon,
  onPress,
  muted = false,
}: {
  label: string;
  icon: IconSymbolName;
  onPress: () => void;
  muted?: boolean;
}): React.ReactElement {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [
        styles.railAction,
        {
          backgroundColor: muted ? colors.surfaceSubtle : colors.accent.clay,
        },
        pressed && styles.pressed,
      ]}
    >
      <IconSymbol
        name={icon}
        size={17}
        color={muted ? colors.ink : colors.accent.onClay}
      />
      <Text
        style={[
          styles.railActionLabel,
          { color: muted ? colors.ink : colors.accent.onClay },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ContextOption({
  label,
  icon,
  selected,
  onPress,
  semanticKind,
  scheme,
}: {
  label: string;
  icon?: IconSymbolName;
  selected: boolean;
  onPress: () => void;
  semanticKind?: CaptureKind;
  scheme: "light" | "dark";
}): React.ReactElement {
  const { colors } = useTheme();
  const backgroundColor =
    selected && semanticKind && semanticKind !== "note"
      ? entryTint(semanticKind, scheme)
      : selected
        ? colors.accent.clay
        : colors.surface;
  const foreground =
    selected && semanticKind && semanticKind !== "note"
      ? entryKicker(semanticKind, scheme)
      : selected
        ? colors.accent.onClay
        : colors.ink;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.menuOption,
        { backgroundColor },
        pressed && styles.pressed,
      ]}
    >
      {icon ? <IconSymbol name={icon} size={14} color={foreground} /> : null}
      <Text style={[styles.menuOptionLabel, { color: foreground }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function renderMenu({
  menu,
  kind,
  projectId,
  activeProjects,
  dateLabel,
  muted,
  scheme,
  onSelectKind,
  onSelectProject,
  onSelectWhen,
  onOpenExactDate,
  onOpenMenu,
}: {
  menu: Exclude<ContextMenu, null>;
  kind: CaptureKind;
  projectId: string | null;
  activeProjects: DbProject[];
  dateLabel: string;
  muted: string;
  scheme: "light" | "dark";
  onSelectKind: (kind: CaptureKind) => void;
  onSelectProject: (projectId: string | null) => void;
  onSelectWhen: (option: WhenOption) => void;
  onOpenExactDate: () => void;
  onOpenMenu: (menu: Exclude<ContextMenu, null>) => void;
}): React.ReactElement {
  if (menu === "kind") {
    return (
      <MenuBlock title="FILE AS" color={muted}>
        {(["idea", "todo", "deadline", "note"] as CaptureKind[]).map((nextKind) => (
          <ContextOption
            key={nextKind}
            label={kindLabel(nextKind)}
            icon={kindIcon(nextKind)}
            selected={kind === nextKind}
            semanticKind={nextKind}
            scheme={scheme}
            onPress={() => onSelectKind(nextKind)}
          />
        ))}
      </MenuBlock>
    );
  }

  if (menu === "project") {
    return (
      <MenuBlock title="PROJECT" color={muted}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.menuRail}
        >
          <ContextOption
            label="Unfiled"
            icon="Folder"
            selected={projectId === null}
            onPress={() => onSelectProject(null)}
            scheme={scheme}
          />
          {activeProjects.map((project) => (
            <ContextOption
              key={project.id}
              label={`${project.emoji ? `${project.emoji} ` : ""}${project.title}`}
              selected={projectId === project.id}
              onPress={() => onSelectProject(project.id)}
              scheme={scheme}
            />
          ))}
        </ScrollView>
      </MenuBlock>
    );
  }

  if (menu === "when") {
    return (
      <MenuBlock title={`WHEN  ·  ${dateLabel}`} color={muted}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.menuRail}
        >
          {WHEN_OPTIONS.map((option) => (
            <ContextOption
              key={option.label}
              label={option.label}
              icon={option.icon}
              selected={
                option.kind === "horizon"
                  ? dateLabel === horizonLabel(option.range)
                  : false
              }
              onPress={() => onSelectWhen(option)}
              scheme={scheme}
            />
          ))}
          <ContextOption
            label="Exact date"
            icon="Target"
            selected={dateLabel !== "When" && dateLabel !== "No date"}
            onPress={onOpenExactDate}
            scheme={scheme}
          />
        </ScrollView>
      </MenuBlock>
    );
  }

  return (
    <MenuBlock title="ADD DETAIL" color={muted}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.menuRail}
      >
        <ContextOption
          label="Type"
          icon="Sparkles"
          selected={false}
          onPress={() => onOpenMenu("kind")}
          scheme={scheme}
        />
        <ContextOption
          label="Project"
          icon="Folder"
          selected={false}
          onPress={() => onOpenMenu("project")}
          scheme={scheme}
        />
        {isDatedKind(kind) ? (
          <ContextOption
            label="When"
            icon="Calendar"
            selected={false}
            onPress={() => onOpenMenu("when")}
            scheme={scheme}
          />
        ) : null}
      </ScrollView>
    </MenuBlock>
  );
}

function MenuBlock({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <View>
      <Text style={[styles.menuTitle, { color }]}>{title}</Text>
      {children}
    </View>
  );
}

function whenLabel(
  exact: boolean,
  date: string,
  time: string,
  dueRange: DueRange | null,
): string {
  if (dueRange) return horizonLabel(dueRange);
  if (exact && date) return `${formatDateLabel(date)}${time ? ` ${time}` : ""}`;
  if (date) return formatDateLabel(date);
  return "No date";
}

function formatDateLabel(value: string): string {
  const [day, month] = value.split("/");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthIndex = Number(month) - 1;
  return `${Number(day)} ${monthNames[monthIndex] ?? month}`;
}

function dateStr(addDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + addDays);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function daysToWeekend(): number {
  const day = new Date().getDay();
  return (6 - day + 7) % 7;
}

const styles = StyleSheet.create({
  console: {
    padding: tokens.space.sm,
    gap: tokens.space.sm,
  },
  menu: {
    borderRadius: tokens.radius.lg,
    padding: tokens.space.sm,
    gap: tokens.space.xs,
  },
  menuTitle: {
    fontFamily: tokens.type.fontMono.medium,
    fontSize: tokens.type.micro.size,
    lineHeight: tokens.type.micro.lineHeight,
    letterSpacing: tokens.type.micro.tracking,
    paddingHorizontal: tokens.space.xs,
  },
  menuRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingVertical: tokens.space.xs,
  },
  menuOption: {
    minHeight: 40,
    maxWidth: 180,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.xs,
  },
  menuOptionLabel: {
    fontFamily: tokens.type.fontInter.medium,
    fontSize: tokens.type.body.size,
    lineHeight: tokens.type.body.lineHeight,
  },
  thoughtRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.sm,
  },
  signalMark: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: tokens.space.xxxl * 3,
    paddingVertical: 0,
    fontFamily: tokens.type.fontInter.medium,
    fontSize: tokens.type.body.size,
    lineHeight: tokens.type.body.lineHeight,
  },
  readout: {
    flex: 1,
    gap: tokens.space.xs,
    paddingVertical: tokens.space.xs,
  },
  kicker: {
    fontFamily: tokens.type.fontMono.medium,
    fontSize: tokens.type.micro.size,
    lineHeight: tokens.type.micro.lineHeight,
    letterSpacing: tokens.type.micro.tracking,
  },
  readoutText: {
    fontFamily: tokens.type.fontInter.medium,
    fontSize: tokens.type.item.size,
    lineHeight: tokens.type.item.lineHeight,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  rail: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
  contextScroll: {
    flex: 1,
    minWidth: 0,
  },
  contextRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
  plusButton: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  contextChip: {
    minHeight: 40,
    maxWidth: 150,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
  contextChipLabel: {
    flexShrink: 1,
    fontFamily: tokens.type.fontInter.medium,
    fontSize: tokens.type.body.size,
    lineHeight: tokens.type.body.lineHeight,
  },
  actionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
  railAction: {
    minHeight: 40,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.xs,
  },
  railActionLabel: {
    fontFamily: tokens.type.fontInter.semiBold,
    fontSize: tokens.type.body.size,
    lineHeight: tokens.type.body.lineHeight,
  },
  pressed: {
    opacity: 0.68,
  },
  disabled: {
    opacity: 0.48,
  },
});
