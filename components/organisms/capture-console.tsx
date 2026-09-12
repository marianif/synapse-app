import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeOutUp,
  useReducedMotion,
} from "react-native-reanimated";

import { WaveformVisualizer } from "@/components/atoms/waveform-bar";
import type { CaptureResolution } from "@/components/molecules/capture-resolver";
import { DockShell } from "@/components/organisms/dock-shell";
import { ExactDateMenu } from "@/components/organisms/exact-date-menu";
import type { InputStageHandle } from "@/components/organisms/input-stage-view";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { entryKicker, entryTint, tokens, useTheme } from "@/constants/theme";
import type { UseCaptureReturn } from "@/hooks/use-capture";
import { useUiPreference } from "@/hooks/use-ui-preference";
import { horizonEndDate, horizonLabel } from "@/lib/horizons";
import type { DbProject, DueRange, EntryType } from "@/lib/types";

type CaptureKind = EntryType | "note";
type ContextMenu = "kind" | "project" | "when" | null;
type DatedKind = "todo" | "deadline";

type WhenOption =
  | {
      kind: "concrete";
      label: string;
      icon: IconSymbolName;
      date: () => string;
    }
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
export const CaptureConsole = forwardRef<InputStageHandle, CaptureConsoleProps>(
  function CaptureConsole({ cap, projects }, ref): React.ReactElement | null {
    const { colors, scheme } = useTheme();
    const reduced = useReducedMotion();
    const inputRef = useRef<TextInput | null>(null);
    const consoleRef = useRef<View | null>(null);

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
    // A typed draft files in one tap: `capture` arms the pending thought, and
    // this ref carries the resolution the pending-thought effect applies once
    // the hook's state lands. Voice keeps the pending review beat (transcript is
    // committed only when the user presses File).
    const pendingResolutionRef = useRef<CaptureResolution | null>(null);

    const activeProjects = projects.filter(
      (project) => project.status === "active",
    );
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

    const { composerOpen, dockAlwaysVisible, setConsoleFocused } = cap;

    // Report text-input focus so the dock's outside-tap backdrop can dim the
    // field behind the bar on always-visible surfaces (home), where
    // `composerOpen` stays false while the user types. Reset when the console
    // is torn down off those surfaces so a stale focus flag never leaves a
    // backdrop floating with no input under it.
    useEffect(() => {
      if (!composerOpen && !dockAlwaysVisible) setConsoleFocused(false);
    }, [composerOpen, dockAlwaysVisible, setConsoleFocused]);

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

    // A typed thought files in one action — there is nothing to review between
    // typing and filing (the chips are the classification). Voice still stops on
    // a reviewable transcript and files on a second tap.
    const fileDraft = (): void => {
      const text = draft.trim();
      if (!text) return;
      setDraft("");
      setMenu(null);
      pendingResolutionRef.current = buildResolution();
      setLastKind(kind);
      cap.capture(text);
      cap.setComposerOpen(false);
      resetTransient(kind);
    };

    const buildResolution = (): CaptureResolution => {
      if (kind === "idea") {
        return { kind: "idea", projectId: projectId ?? undefined };
      }
      if (kind === "note") {
        return { kind: "note", projectId: projectId ?? undefined };
      }
      if (kind === "deadline") {
        return {
          kind: "deadline",
          dueDate: dueRange
            ? horizonEndDate(dueRange)
            : date.trim() || undefined,
          dueTime: dueRange ? undefined : time.trim() || undefined,
          dueRange: dueRange ?? undefined,
          projectId: projectId ?? undefined,
        };
      }
      return {
        kind: "todo",
        scheduledDate: dueRange
          ? horizonEndDate(dueRange)
          : date.trim() || undefined,
        scheduledTime: dueRange ? undefined : time.trim() || undefined,
        projectId: projectId ?? undefined,
      };
    };

    // Applies a staged typed-draft resolution as soon as the hook commits the
    // pending thought. Voice is unaffected: pendingResolutionRef stays null, so a
    // voice capture waits for the explicit File press.
    useEffect(() => {
      if (
        cap.pendingThought === null ||
        pendingResolutionRef.current === null
      ) {
        return;
      }
      const resolution = pendingResolutionRef.current;
      pendingResolutionRef.current = null;
      cap.resolveCapture(resolution);
    }, [cap]);

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
      Keyboard.dismiss();
      consoleRef.current?.measureInWindow((x, y, w, h) => {
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

    const file = (): void => {
      if (!hasThought) return;

      setLastKind(kind);
      cap.resolveCapture(buildResolution());
      cap.setComposerOpen(false);
      resetTransient(kind);
    };

    const openMenu = (nextMenu: Exclude<ContextMenu, null>): void => {
      if (cap.isRecording) return;
      setMenu((current) => (current === nextMenu ? null : nextMenu));
    };

    const menuEntering = reduced
      ? undefined
      : FadeInDown.duration(tokens.motion.duration.fast);
    const menuExiting = reduced
      ? undefined
      : FadeOutUp.duration(tokens.motion.duration.fast);

    if (
      !cap.composerOpen &&
      !cap.isRecording &&
      cap.pendingThought === null &&
      !cap.dockAlwaysVisible
    ) {
      return null;
    }

    return (
      <DockShell
        register="surface"
        contentKey="capture-console"
        radius={tokens.radius.lg}
        bordered
        overlay={
          menu ? (
            <Animated.View
              entering={menuEntering}
              exiting={menuExiting}
              style={styles.menu}
            >
              {renderMenu({
                menu,
                kind,
                projectId,
                activeProjects,
                dateLabel: whenLabel(exact, date, time, dueRange),
                scheme,
                onSelectKind: selectKind,
                onSelectProject: selectProject,
                onSelectWhen: selectWhen,
                onOpenExactDate: openExactDate,
              })}
            </Animated.View>
          ) : undefined
        }
      >
        <View ref={consoleRef} collapsable={false} style={styles.console}>
          <View style={styles.thoughtRow}>
            {cap.isRecording ? (
              <View
                style={[
                  styles.iconButton,
                  { backgroundColor: colors.surfaceSubtle },
                ]}
              >
                <IconSymbol name="Microphone" size={18} color={colors.ink} />
              </View>
            ) : (
              <View style={styles.signalMark}>
                <IconSymbol name="Pen" size={18} color={colors.inkMuted} />
              </View>
            )}
            {cap.isRecording ? (
              <>
                <View style={[styles.readout, styles.recordingReadout]}>
                  {cap.transcript ? (
                    <Text
                      style={[styles.readoutText, { color: colors.ink }]}
                      numberOfLines={2}
                    >
                      {cap.transcript}
                    </Text>
                  ) : (
                    <WaveformVisualizer barCount={9} color={colors.ink} />
                  )}
                </View>
                <Pressable
                  onPress={() => void cap.cancelRecording()}
                  accessibilityRole="button"
                  accessibilityLabel="Discard recording"
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.iconButton,
                    { backgroundColor: colors.surfaceSubtle },
                    pressed && styles.pressed,
                  ]}
                >
                  <IconSymbol name="X" size={18} color={colors.ink} />
                </Pressable>
                <Pressable
                  onPress={() => void cap.stopRecording()}
                  accessibilityRole="button"
                  accessibilityLabel="Continue"
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.iconButton,
                    { backgroundColor: colors.accent.clay },
                    pressed && styles.pressed,
                  ]}
                >
                  <IconSymbol
                    name="ArrowRight"
                    size={18}
                    color={colors.accent.onClay}
                  />
                </Pressable>
              </>
            ) : hasThought ? (
              <View style={styles.readout}>
                <Text style={[styles.kicker, { color: colors.inkMuted }]}>
                  THOUGHT
                </Text>
                <Text
                  style={[styles.readoutText, { color: colors.ink }]}
                  numberOfLines={2}
                >
                  {pendingThought}
                </Text>
              </View>
            ) : (
              <>
                <TextInput
                  ref={inputRef}
                  value={draft}
                  onChangeText={setDraft}
                  onSubmitEditing={fileDraft}
                  onFocus={() => cap.setConsoleFocused(true)}
                  onBlur={() => {
                    cap.setConsoleFocused(false);
                    closeEmpty();
                  }}
                  placeholder="Put something in"
                  placeholderTextColor={colors.inkMuted}
                  selectionColor={colors.ink}
                  returnKeyType="done"
                  submitBehavior="submit"
                  accessibilityLabel="Put something in"
                  multiline
                  style={[styles.input, { color: colors.ink }]}
                />
                <Pressable
                  onPress={() => void cap.startRecording()}
                  accessibilityRole="button"
                  accessibilityLabel="Capture by voice"
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.iconButton,
                    { backgroundColor: colors.surfaceSubtle },
                    pressed && styles.pressed,
                  ]}
                >
                  <IconSymbol name="Microphone" size={18} color={colors.ink} />
                </Pressable>
              </>
            )}
            {hasThought ? (
              <Pressable
                onPress={discard}
                accessibilityRole="button"
                accessibilityLabel="Discard capture"
                hitSlop={8}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.pressed,
                ]}
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
                <ContextChip
                  label={whenLabel(exact, date, time, dueRange)}
                  icon="Calendar"
                  scheme={scheme}
                  onPress={() => openMenu("when")}
                  disabled={cap.isRecording}
                />
              ) : null}
            </ScrollView>

            <View style={styles.actionGroup}>
              {(hasThought || hasDraft) && !cap.isRecording ? (
                <Pressable
                  onPress={hasThought ? file : fileDraft}
                  accessibilityRole="button"
                  accessibilityLabel="File"
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.iconButton,
                    { backgroundColor: colors.accent.clay },
                    pressed && styles.pressed,
                  ]}
                >
                  <IconSymbol
                    name="Check"
                    size={18}
                    color={colors.accent.onClay}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        <ExactDateMenu
          visible={datePickerOpen}
          initialDate={date}
          initialTime={time}
          accentColor={entryKicker(
            kind === "deadline" ? "deadline" : "todo",
            scheme,
          )}
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
  },
);

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
      <Text
        style={[styles.contextChipLabel, { color: semantic.color }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {!disabled ? (
        <IconSymbol name="ChevronDown" size={13} color={semantic.color} />
      ) : null}
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
        : colors.surfaceSubtle;
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
      <Text
        style={[styles.menuOptionLabel, { color: foreground }]}
        numberOfLines={1}
      >
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
  scheme,
  onSelectKind,
  onSelectProject,
  onSelectWhen,
  onOpenExactDate,
}: {
  menu: Exclude<ContextMenu, null>;
  kind: CaptureKind;
  projectId: string | null;
  activeProjects: DbProject[];
  dateLabel: string;
  scheme: "light" | "dark";
  onSelectKind: (kind: CaptureKind) => void;
  onSelectProject: (projectId: string | null) => void;
  onSelectWhen: (option: WhenOption) => void;
  onOpenExactDate: () => void;
}): React.ReactElement | null {
  if (menu === "kind") {
    return (
      <MenuBlock>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.menuRail}
        >
          {(["idea", "todo", "deadline", "note"] as CaptureKind[]).map(
            (nextKind) => (
              <ContextOption
                key={nextKind}
                label={kindLabel(nextKind)}
                icon={kindIcon(nextKind)}
                selected={kind === nextKind}
                semanticKind={nextKind}
                scheme={scheme}
                onPress={() => onSelectKind(nextKind)}
              />
            ),
          )}
        </ScrollView>
      </MenuBlock>
    );
  }

  if (menu === "project") {
    return (
      <MenuBlock>
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
      <MenuBlock>
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

  return null;
}

function MenuBlock({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <View style={styles.menuBlock}>{children}</View>;
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
    padding: tokens.space.xs,
    gap: tokens.space.xs,
  },
  menu: {
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.xs,
  },
  menuBlock: {
    gap: tokens.space.xs,
  },
  menuRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingVertical: tokens.space.xs,
  },
  menuOption: {
    minHeight: 40,
    borderRadius: tokens.radius.pill,
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
    minHeight: 44,
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
    maxHeight: tokens.space.xxxl * 2,
    paddingVertical: 0,
    textAlignVertical: "center",
    fontFamily: tokens.type.fontInter.medium,
    fontSize: tokens.type.body.size,
    lineHeight: tokens.type.body.lineHeight,
  },
  readout: {
    flex: 1,
    gap: tokens.space.xs,
    paddingVertical: tokens.space.xs,
  },
  recordingReadout: {
    paddingVertical: 0,
    alignItems: "center",
    justifyContent: "center",
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
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.sm,
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
  contextChip: {
    minHeight: 32,
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
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.68,
  },
  disabled: {
    opacity: 0.48,
  },
});
