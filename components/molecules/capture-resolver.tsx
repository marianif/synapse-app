import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  SlideInDown,
  useReducedMotion,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { SketchIcon } from "@/components/atoms/sketch-icon";
import { ThemedText } from "@/components/atoms/themed-text";
import { LinkableIdea } from "@/components/organisms/link-sheet";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { entryColor, tokens, useTheme } from "@/constants/theme";
import { horizonEndDate, horizonLabel } from "@/lib/horizons";
import type { DbProject, DueRange } from "@/lib/types";

dayjs.extend(customParseFormat);

// A recent idea the captured thought can be filed under — same shape the link
// sheet uses, re-exported so call-sites can import it from either place.
export type { LinkableIdea };

/**
 * Where a captured thought is filed. `todo`/`deadline` carry the optional detail
 * the writer set in the inline panel; `idea`/`note`/`note-on` are bare. There is
 * no "more" escape hatch — the rich modal was retired and capture is the single
 * creation path (PRODUCT.md: one trigger, no second add).
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
  /** Recent ideas a note can be linked onto. Empty → "note" files free. */
  ideas: LinkableIdea[];
  /** Active projects offered in the detail panel. */
  projects: DbProject[];
  /** Whether the note rail (free note + linkable ideas) is expanded in place. */
  picking: boolean;
  onTogglePicking: () => void;
  /** Commit a destination. */
  onResolve: (resolution: CaptureResolution) => void;
  /** Discard the pending thought without filing it. */
  onDismiss: () => void;
}

// The two destinations that carry detail. Picking one SELECTS it (and opens the
// detail line); the corner glyph turns into a save-and-close check. The bare
// destinations file on first tap — they have nothing to configure.
type DatedKind = "todo" | "deadline";

// One WHEN grammar shared by both dated verbs (todo + deadline). No today /
// tomorrow — capture is for what's ahead, not what's now. Two flavors:
//   • concrete — resolves to a single DD/MM/YYYY date (a day → today, weekend →
//     coming Saturday). "a day" then invites the exact stepper to nudge off today.
//   • horizon — a DueRange window (this week / month / year); todos store the
//     window's end date, deadlines additionally keep the range.
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

/**
 * The post-capture destination chooser. No bubbles, no buttons: every choice is
 * a word you READ and tap, in its type color, the active one bold + underlined.
 * Instrument-panel register (DESIGN.md: tonal weight and edge-bars carry
 * structure, not capsules).
 *
 * Two grammars, kept apart by behavior:
 *   • Bare verbs — keep (idea) · note — file on the first tap (note opens a rail
 *     to pick free-vs-linked when recent ideas exist, else files free).
 *   • Dated verbs — do it (todo) · by a date (deadline) — first tap underlines
 *     the verb and opens an inline WHEN/PROJECT readout. The header glyph then
 *     becomes a type-colored ✓ that saves-and-closes (no separate Save slab).
 *
 * The WHEN and PROJECT rows are value-readouts, not chip rails: the options sit
 * inline as plain tappable words, the chosen one colored. The precise day/time
 * wheel stays opt-in behind "exact". Amber capture edge on the left.
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

  // The selected dated destination (null = nothing selected, detail closed).
  const [selected, setSelected] = useState<DatedKind | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [dueRange, setDueRange] = useState<DueRange | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [exact, setExact] = useState(false);

  const activeProjects = projects.filter((p) => p.status === "active");

  // First tap on a dated verb underlines it + opens detail; tapping the other
  // dated verb switches kind. The WHEN grammar is shared, so the picked when
  // carries across the switch. Commit now lives in the corner glyph. Opening a
  // dated detail closes the note rail — only one subcomponent open at a time.
  function selectDated(kind: DatedKind): void {
    setSelected(kind);
    if (picking) onTogglePicking();
  }

  function commitDated(kind: DatedKind): void {
    if (kind === "deadline") {
      onResolve({
        kind: "deadline",
        dueDate: dueRange ? horizonEndDate(dueRange) : date.trim() || undefined,
        dueTime: dueRange ? undefined : time.trim() || undefined,
        dueRange: dueRange ?? undefined,
        projectId: projectId ?? undefined,
      });
    } else {
      // Todos have no dueRange field — a horizon lands them on its end date.
      onResolve({
        kind: "todo",
        scheduledDate: dueRange
          ? horizonEndDate(dueRange)
          : date.trim() || undefined,
        scheduledTime: dueRange ? undefined : time.trim() || undefined,
        projectId: projectId ?? undefined,
      });
    }
  }

  const accent = selected ? entryColor(selected) : colors.type.todo;
  // Immediacy over bounce: a quick eased reflow, no spring overshoot.
  const layout = reduced
    ? undefined
    : LinearTransition.duration(160).easing(Easing.out(Easing.quad));

  const projectName =
    projectId === null
      ? "unfiled"
      : (activeProjects.find((p) => p.id === projectId)?.title ?? "unfiled");

  return (
    <Animated.View
      // The whole resolver rises up from under the tab bar — one decisive slide.
      entering={
        reduced
          ? undefined
          : SlideInDown.duration(320).easing(Easing.out(Easing.cubic))
      }
      exiting={reduced ? undefined : FadeOut.duration(110)}
      layout={layout}
      style={[styles.card, { backgroundColor: colors.surface }]}
    >
      <View style={[styles.edge, { backgroundColor: colors.type.ideas }]} />

      <View style={styles.body}>
        {/* Header — what's being filed. The corner glyph is a discard ✕ until a
            dated verb is selected, then a type-colored ✓ that saves-and-closes. */}
        <View style={styles.headRow}>
          <PenLine color={colors.inkMuted} size={18} />
          <ThemedText
            type="body"
            numberOfLines={1}
            style={[styles.echo, { color: colors.ink }]}
          >
            {text}
          </ThemedText>
          <Pressable
            onPress={() => (selected ? commitDated(selected) : onDismiss())}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={
              selected
                ? selected === "deadline"
                  ? "Save deadline"
                  : "Save to-do"
                : "Discard this thought"
            }
            style={({ pressed }) => [
              styles.corner,
              pressed && { opacity: 0.5 },
            ]}
          >
            <IconSymbol
              name={selected ? "check" : "close"}
              size={selected ? 20 : 16}
              color={selected ? accent : colors.inkMuted}
            />
          </Pressable>
        </View>

        {/* The verb line — the primary choice, read not tapped-at. Type color on
            each word; the picked dated verb is bold + underlined. Bare verbs
            (keep/note) file immediately. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.verbLine}
        >
          <Verb
            label="Keep"
            color={colors.type.ideas}
            onPress={() => onResolve({ kind: "idea" })}
            accessibilityLabel="Keep as idea"
          />
          <Sep color={colors.inkMuted} />
          <Verb
            label="do it"
            color={colors.type.todo}
            selected={selected === "todo"}
            onPress={() => selectDated("todo")}
            accessibilityLabel="Make it a to-do"
            accessibilityState={{ selected: selected === "todo" }}
          />
          <Sep color={colors.inkMuted} />
          <Verb
            label="by a date"
            color={colors.type.bills}
            selected={selected === "deadline"}
            onPress={() => selectDated("deadline")}
            accessibilityLabel="Make it a deadline"
            accessibilityState={{ selected: selected === "deadline" }}
          />
          <Sep color={colors.inkMuted} />
          <Verb
            label="note"
            color={colors.inkMuted}
            muted
            selected={picking}
            // No recent ideas to link onto → file as a free note immediately.
            // Otherwise open the note rail to choose free-vs-linked.
            onPress={() =>
              ideas.length > 0 ? onTogglePicking() : onResolve({ kind: "note" })
            }
            accessibilityLabel="File as diary note"
            accessibilityState={{ expanded: picking }}
          />
        </ScrollView>

        {/* Note destinations — free note (left, fixed) + linkable ideas (right,
            scrollable). Slides in under the verb line when "note" is picked. */}
        {picking ? (
          <Animated.View
            entering={reduced ? undefined : FadeIn.duration(140)}
            exiting={reduced ? undefined : FadeOut.duration(90)}
            layout={layout}
          >
            <View style={styles.noteRail}>
              {/* Free note — fixed on the left. A note with no idea behind it. */}
              <Pressable
                onPress={() => onResolve({ kind: "note" })}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="File as a free note"
                style={({ pressed }) => [
                  styles.freeNoteChip,
                  { backgroundColor: colors.surfaceSubtle },
                  pressed && { opacity: 0.5 },
                ]}
              >
                <ThemedText
                  type="micro"
                  style={[styles.freeNoteLabel, { color: colors.inkMuted }]}
                >
                  free note
                </ThemedText>
              </Pressable>

              {/* Linkable ideas — scrollable on the right. Tap to note onto one. */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.ideaRail}
              >
                {ideas.map((idea) => (
                  <Pressable
                    key={idea.id}
                    onPress={() =>
                      onResolve({ kind: "note-on", entryId: idea.id })
                    }
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Note on idea: ${idea.title}`}
                    style={styles.ideaItem}
                  >
                    <SketchIcon type="idea" size={13} />
                    <ThemedText
                      type="body"
                      numberOfLines={1}
                      style={[styles.ideaLabel, { color: colors.ink }]}
                    >
                      {idea.title}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Animated.View>
        ) : null}

        {/* Detail — only for the selected dated verb. Inline value readouts in
            the same word-not-bubble language as the verb line. */}
        {selected ? (
          <Animated.View
            entering={reduced ? undefined : FadeIn.duration(140)}
            exiting={reduced ? undefined : FadeOut.duration(90)}
            layout={layout}
            style={styles.detail}
          >
            {/* WHEN — one shared grammar for todo + deadline: concrete days and
                closing horizons as inline tappable words. "exact" reveals the
                precise day/time stepper. */}
            <ValueRow label="WHEN">
              {WHEN_OPTIONS.map((o) =>
                o.kind === "concrete" ? (
                  <Value
                    key={o.label}
                    label={o.label}
                    color={accent}
                    selected={!exact && dueRange === null && date === o.date()}
                    onPress={() => {
                      setExact(false);
                      setDueRange(null);
                      setDate(o.date());
                      setTime("");
                    }}
                  />
                ) : (
                  <Value
                    key={o.label}
                    label={o.label}
                    color={accent}
                    selected={!exact && dueRange === o.range}
                    onPress={() => {
                      setExact(false);
                      setDueRange(o.range);
                      setDate("");
                      setTime("");
                    }}
                  />
                ),
              )}
              <Value
                label="exact"
                color={accent}
                selected={exact}
                onPress={() => {
                  setExact((v) => !v);
                  setDueRange(null);
                }}
              />
            </ValueRow>

            {/* The precise day + time — a one-line stepper readout, opt-in. No
                wheel, no panel, no bubbles: the value IS the control. */}
            {exact ? (
              <ExactWhen
                date={date}
                time={time}
                accent={accent}
                onDateChange={setDate}
                onTimeChange={setTime}
              />
            ) : dueRange ? (
              <ThemedText type="micro" style={{ color: colors.inkMuted }}>
                {selected === "deadline" ? "Close it" : "Land it"}{" "}
                {horizonLabel(dueRange)} — by {horizonEndDate(dueRange)}.
              </ThemedText>
            ) : null}

            {/* PROJECT — attribution as inline words. Hidden with no projects. */}
            {activeProjects.length > 0 ? (
              <ValueRow label="PROJECT">
                <Value
                  label="unfiled"
                  color={accent}
                  selected={projectId === null}
                  onPress={() => setProjectId(null)}
                />
                {activeProjects.map((p) => (
                  <Value
                    key={p.id}
                    label={p.title}
                    color={accent}
                    selected={projectId === p.id}
                    onPress={() =>
                      setProjectId((id) => (id === p.id ? null : p.id))
                    }
                  />
                ))}
              </ValueRow>
            ) : null}

            {/* A quiet echo of the resolved attribution — the readout, not a
                button. The corner ✓ commits. */}
            <View style={styles.headRow}>
              <ThemedText type="mono" style={{ color: colors.inkMuted }}>
                {selected === "deadline" ? "Deadline" : "To-do"} ·
              </ThemedText>
              <ThemedText type="hand" style={{ color: colors.inkMuted }}>
                {projectName}
              </ThemedText>
            </View>
          </Animated.View>
        ) : null}
      </View>
    </Animated.View>
  );
}

// Concrete one-tap dates stored DD/MM/YYYY via the same format the stepper uses,
// so a quick-pick and an exact pick are interchangeable.
function dateStr(addDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + addDays);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function daysToWeekend(): number {
  // The coming Saturday (today if already Sat).
  const day = new Date().getDay();
  return (6 - day + 7) % 7;
}

// ── Exact when — a one-line stepper readout, no wheel ─────────────────────────

const STORE_FMT = "DD/MM/YYYY";

/**
 * The precise day + time, compacted to a single instrument readout. The date and
 * time are big mono values; bare chevron steppers nudge them (±1 day, ±15 min),
 * press-and-hold to repeat. No wheel, no panel, no chips — the value is the
 * control. The relative quick-picks (today/tomorrow/weekend) live at the top
 * WHEN level, so they're deliberately absent here.
 */
function ExactWhen({
  date,
  time,
  accent,
  onDateChange,
  onTimeChange,
}: {
  date: string;
  time: string;
  accent: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}): React.ReactElement {
  const { colors } = useTheme();

  // Default the date to today the moment exact opens with nothing set.
  useEffect(() => {
    if (!date) onDateChange(dayjs().format(STORE_FMT));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const day = date ? dayjs(date, STORE_FMT) : dayjs();

  function nudgeDay(delta: number): void {
    const today = dayjs().startOf("day");
    let next = day.add(delta, "day");
    // Never schedule into the past — a big jump backwards floors at today
    // rather than no-op'ing, so a held chevron lands on today instead of stalling.
    if (next.isBefore(today)) {
      if (day.isSame(today, "day")) return; // already at the floor
      next = today;
    }
    onDateChange(next.format(STORE_FMT));
  }

  function nudgeTime(delta: number): void {
    if (!time) {
      onTimeChange(delta > 0 ? "09:00" : "08:45");
      return;
    }
    const [h, m] = time.split(":").map(Number);
    let total = (h * 60 + m + delta * 15 + 24 * 60) % (24 * 60);
    const nh = Math.floor(total / 60);
    const nm = total % 60;
    onTimeChange(
      `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`,
    );
  }

  const timeLabel = time
    ? dayjs()
        .hour(Number(time.split(":")[0]))
        .minute(Number(time.split(":")[1]))
        .format("h:mm A")
    : "all day";

  return (
    <View style={styles.exact}>
      {/* Date stepper — tap nudges ±1 day, hold jumps ±10 days. */}
      <Stepper
        accent={accent}
        onLeft={() => nudgeDay(-1)}
        onRight={() => nudgeDay(1)}
        onLeftHold={() => nudgeDay(-10)}
        onRightHold={() => nudgeDay(10)}
        accessibilityLabel="Adjust day"
      >
        <ThemedText
          type="mono"
          style={[styles.exactValue, { color: colors.ink }]}
        >
          {day.format("ddd D MMM")}
        </ThemedText>
      </Stepper>

      {/* Time stepper — tap nudges ±15 min, hold jumps ±1 hour. Tapping the
          label clears back to all-day. */}
      <Stepper
        accent={accent}
        onLeft={() => nudgeTime(-1)}
        onRight={() => nudgeTime(1)}
        onLeftHold={() => nudgeTime(-4)}
        onRightHold={() => nudgeTime(4)}
        accessibilityLabel="Adjust time"
      >
        <Pressable
          onPress={() => time && onTimeChange("")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={time ? "Clear time, all day" : "Time"}
        >
          <ThemedText
            type="mono"
            style={[
              styles.exactValue,
              { color: time ? colors.ink : colors.inkMuted },
            ]}
          >
            {timeLabel}
          </ThemedText>
        </Pressable>
      </Stepper>
    </View>
  );
}

/**
 * A value flanked by two press-and-hold chevron steppers. Bare glyphs, no box.
 * A tap fires the small step (`onLeft`/`onRight`); holding fires the big jump
 * (`onLeftHold`/`onRightHold`) on repeat.
 */
function Stepper({
  accent,
  onLeft,
  onRight,
  onLeftHold,
  onRightHold,
  accessibilityLabel,
  children,
}: {
  accent: string;
  onLeft: () => void;
  onRight: () => void;
  onLeftHold: () => void;
  onRightHold: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <View style={styles.stepper} accessibilityLabel={accessibilityLabel}>
      <RepeatButton
        onTrigger={onLeft}
        onRepeat={onLeftHold}
        accessibilityLabel="Decrease"
      >
        <IconSymbol name="chevron-left" size={22} color={accent} />
      </RepeatButton>
      {children}
      <RepeatButton
        onTrigger={onRight}
        onRepeat={onRightHold}
        accessibilityLabel="Increase"
      >
        <IconSymbol name="chevron-right" size={22} color={accent} />
      </RepeatButton>
    </View>
  );
}

/**
 * Fires `onTrigger` once on press (a tap = small step). Hold past the delay and
 * it switches to `onRepeat` (a big jump) on a steady tick — so the user nudges
 * by ±1 with a tap and travels by ±10 days / ±1 hour by holding, no press-press-press.
 */
function RepeatButton({
  onTrigger,
  onRepeat,
  accessibilityLabel,
  children,
}: {
  onTrigger: () => void;
  onRepeat: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}): React.ReactElement {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const delay = useRef<ReturnType<typeof setTimeout> | null>(null);

  function start(): void {
    onTrigger();
    // Hold: after a short delay, repeat with the big jump at a steady tick.
    delay.current = setTimeout(() => {
      timer.current = setInterval(onRepeat, 120);
    }, 350);
  }

  function stop(): void {
    if (delay.current) clearTimeout(delay.current);
    if (timer.current) clearInterval(timer.current);
    delay.current = null;
    timer.current = null;
  }

  useEffect(() => stop, []);

  return (
    <Pressable
      onPressIn={start}
      onPressOut={stop}
      hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.repeat, pressed && { opacity: 0.5 }]}
    >
      {children}
    </Pressable>
  );
}

// ── Verbs & values — words, not bubbles ───────────────────────────────────────

/**
 * A single tappable verb on the destination line. The affordance is the word
 * itself in its type color — no enclosure. Picked dated verbs go bold with a
 * 2px underline in their color (the edge-bar pattern, laid flat). Generous
 * vertical padding + hitSlop keep the tap target ≥44pt though the ink is small.
 */
function Verb({
  label,
  color,
  selected = false,
  muted = false,
  onPress,
  accessibilityLabel,
  accessibilityState,
}: {
  label: string;
  color: string;
  selected?: boolean;
  muted?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityState?: { selected?: boolean; expanded?: boolean };
}): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      style={({ pressed }) => [styles.verb, pressed && { opacity: 0.5 }]}
    >
      <ThemedText
        type="item"
        style={[styles.verbText, { color }, selected && styles.verbSelected]}
      >
        {label}
      </ThemedText>
      <View
        style={[
          styles.verbUnderline,
          { backgroundColor: selected ? color : "transparent" },
        ]}
      />
    </Pressable>
  );
}

/**
 * The "filing" mark — a hand-drawn pen with a written line trailing under its
 * nib. Replaces the "FILE AS" kicker so the header reads as the narrative,
 * agenda gesture (writing the thought down) rather than a form label. Matches
 * the loose single-weight strokes of SketchIcon.
 */
function PenLine({
  color,
  size = 18,
}: {
  color: string;
  size?: number;
}): React.ReactElement {
  const sw = (size / 18) * 1.6;
  const common = {
    stroke: color,
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Pen body, slanted top-right → mid, with a little nib at the bottom. */}
      <Path d="M20 4.2 L11.4 12.9 L10 16 L13.1 14.6 L21.7 5.9 Z" {...common} />
      {/* Ink split on the nib. */}
      <Path d="M11.4 12.9 L13.1 14.6" {...common} />
      {/* The written line, trailing under the nib with a hand wobble. */}
      <Path
        d="M3 19.4 C6 18.6 9 20 12 19.2 C14.4 18.6 16 19.4 18 19"
        {...common}
      />
    </Svg>
  );
}

/**
 * A row of inline value words behind a mono kicker key — the detail readout that
 * replaces chip rails. "WHEN  today tomorrow weekend exact". The chosen value is
 * colored + medium-weight; the rest are muted ink. No capsules.
 */
function ValueRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View style={styles.valueRow}>
      <ThemedText
        type="micro"
        style={[styles.valueKey, { color: colors.inkMuted }]}
      >
        {label}
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.valueList}
      >
        {children}
      </ScrollView>
    </View>
  );
}

/** A single tappable value word in a ValueRow. Colored when chosen, else muted. */
function Value({
  label,
  color,
  selected,
  onPress,
}: {
  label: string;
  color: string;
  selected: boolean;
  onPress: () => void;
}): React.ReactElement {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.value, pressed && { opacity: 0.5 }]}
    >
      <ThemedText
        type="body"
        numberOfLines={1}
        style={[
          styles.valueText,
          selected
            ? { color, fontFamily: tokens.type.fontInter.semiBold }
            : { color: colors.inkMuted },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** A faint middot separating verbs — punctuation, not chrome. */
function Sep({ color }: { color: string }): React.ReactElement {
  return (
    <ThemedText type="item" style={[styles.sep, { color }]}>
      ·
    </ThemedText>
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
    gap: tokens.space.xs,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  echo: {
    flex: 1,
  },
  corner: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  verbLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingVertical: tokens.space.xs,
  },
  verb: {
    alignItems: "center",
    paddingVertical: tokens.space.xs,
  },
  verbText: {
    fontFamily: tokens.type.fontInter.medium,
  },
  verbSelected: {
    fontFamily: tokens.type.fontInter.bold,
  },
  verbUnderline: {
    height: 2,
    alignSelf: "stretch",
    marginTop: 2,
    borderRadius: tokens.radius.pill,
  },
  sep: {
    opacity: 0.5,
  },
  noteRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    paddingTop: tokens.space.xs,
  },
  freeNoteChip: {
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.xs,
    borderRadius: tokens.radius.pill,
  },
  freeNoteLabel: {
    letterSpacing: 0.3,
  },
  ideaRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.lg,
    paddingVertical: tokens.space.xs,
    paddingRight: tokens.space.sm,
  },
  ideaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    maxWidth: 200,
    paddingVertical: tokens.space.xs,
  },
  ideaLabel: {
    flexShrink: 1,
    fontFamily: tokens.type.fontHand.medium,
    fontSize: 18,
    lineHeight: 22,
  },
  detail: {
    gap: tokens.space.sm,
    paddingTop: tokens.space.sm,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
  },
  valueKey: {
    width: 52,
  },
  valueList: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.lg,
    paddingRight: tokens.space.sm,
  },
  value: {
    paddingVertical: tokens.space.xs,
  },
  valueText: {
    maxWidth: 160,
  },
  exact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    rowGap: tokens.space.xs,
    columnGap: tokens.space.lg,
    paddingVertical: tokens.space.xs,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  exactValue: {
    minWidth: 92,
    textAlign: "center",
  },
  repeat: {
    paddingVertical: tokens.space.xs,
  },
});
