import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeOut,
  LinearTransition,
  SlideInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ResolverSep } from "@/components/atoms/resolver-sep";
import { ResolverValue } from "@/components/atoms/resolver-value";
import { ResolverVerb } from "@/components/atoms/resolver-verb";
import { SketchIcon } from "@/components/atoms/sketch-icon";
import { ThemedText } from "@/components/atoms/themed-text";
import { ExactWhen } from "@/components/molecules/exact-when";
import { PenLine } from "@/components/molecules/pen-line";
import { ValueRow } from "@/components/molecules/value-row";
import { LinkableIdea } from "@/components/organisms/link-sheet";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { entryColor, tokens, useTheme } from "@/constants/theme";
import type { Scheme } from "@/constants/theme";
import { horizonEndDate, horizonLabel } from "@/lib/horizons";
import type { DbProject, DueRange, EntryType } from "@/lib/types";

// The resolver bar is the one surface in Field Lab that means "interface
// affordance, not content": it lifts the resolver off the field as the doorway
// it is, and can never be mistaken for a single type the way the old amber chrome
// was (amber = idea everywhere else). The bar now follows the active scheme — a
// light slab in light mode, a graphite slab in dark mode — so its inks track the
// SAME scheme as the bar surface (otherwise an off-scheme ink would vanish on it).
type BarPalette = {
  bar: string; // chooser bar surface
  ink: string; // primary on-bar text
  inkMuted: string; // recessive on-bar text
  panel: string; // recessed workbench well
  chip: string; // raised pill on the workbench well
};

function barPalette(scheme: Scheme): BarPalette {
  const c = tokens.color[scheme];
  return {
    bar: c.paper,
    ink: c.ink,
    inkMuted: c.inkMuted,
    panel: c.surfaceSubtle,
    chip: c.surface,
  };
}

// Verb type-color on the bar — the bright electric codes clear AA on the graphite
// dark surface; on the light paper surface the scheme-tuned kicker shades keep
// the same legibility, so the verb color tracks the active scheme too.
function verbColor(type: EntryType): string {
  return entryColor(type);
}

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
  /**
   * When set, any captured todo/deadline is pre-attributed to this project
   * and the PROJECT picker row is hidden — the resolver was summoned from
   * INSIDE the project surface, so attribution is implied. The "unfiled"
   * option doesn't make sense there, and offering a switcher would let the
   * user accidentally re-attribute the capture away from where they meant
   * it to land.
   */
  lockedProjectId?: string | null;
  /**
   * A type to open pre-selected on. When it's a dated verb (todo / deadline)
   * the resolver skips the neutral chooser and lands straight on that door's
   * workbench — set when capture was summoned from a type-specific surface
   * (e.g. an empty "No deadlines yet" stream), so the user isn't re-asked what
   * they already said. `idea` / `note` have no workbench, so they fall through
   * to the neutral chooser (their door is a single tap away anyway).
   */
  seedType?: EntryType | null;
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
 * wheel stays opt-in behind "exact". The whole resolver is one neutral interface
 * slab that follows the active scheme — light paper in light mode, graphite in
 * dark mode — the interface object, never a type tint.
 */
export function CaptureResolver({
  text,
  ideas,
  projects,
  picking,
  onTogglePicking,
  onResolve,
  onDismiss,
  lockedProjectId = null,
  seedType = null,
}: CaptureResolverProps): React.ReactElement {
  const reduced = useReducedMotion();
  const { scheme } = useTheme();

  // The bar surface + on-bar inks track the active scheme: a light paper slab in
  // light mode, a graphite slab in dark mode. Resolved here so every readout on
  // the bar stays legible against whichever surface the scheme picks.
  const {
    bar: BAR,
    ink: BAR_INK,
    inkMuted: BAR_INK_MUTED,
    panel: BAR_PANEL,
    chip: BAR_CHIP,
  } = barPalette(scheme);

  // The selected dated destination (null = nothing selected, detail closed).
  // Seed from a type-specific summon: a seeded todo/deadline opens straight on
  // its workbench. idea/note have no workbench, so they leave this null and the
  // neutral chooser shows (their door is one tap away).
  const [selected, setSelected] = useState<DatedKind | null>(
    seedType === "todo" || seedType === "deadline" ? seedType : null,
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [dueRange, setDueRange] = useState<DueRange | null>(null);
  // Seed from the lock so the resolved attribution carries the locked project
  // even on the very first commit. Re-seeding on lock change is intentional —
  // the project surface re-mounts the resolver with a fresh thought each time.
  const [projectId, setProjectId] = useState<string | null>(lockedProjectId);
  const [exact, setExact] = useState(false);

  const activeProjects = projects.filter((p) => p.status === "active");

  // The resolver is a two-step horizontal CAROUSEL, not a panel that grows
  // downward. Step 1 is the chooser (echoed thought + the four doors); step 2 is
  // the workbench (the dated WHEN/PROJECT detail, or the note rail). Picking a
  // door slides the whole strip left to step 2; the back chevron slides it home.
  // The strip never gets taller from a choice — the choice REPLACES, never stacks.
  const atDetail = selected !== null || picking;

  // The slide is a transform on a 2-wide track, driven by the measured strip
  // width (RN can't translate by % reliably, so we measure once via onLayout).
  // `stripWidthPx` (React state) sizes each step's layout; `stripWidth` (shared
  // value) feeds the UI-thread translate. Both updated from the same onLayout.
  const [stripWidthPx, setStripWidthPx] = useState(0);
  const stripWidth = useSharedValue(0);
  const progress = useSharedValue(0); // 0 = chooser, 1 = detail

  // Both steps are absolutely positioned (so neither reserves the other's
  // height); the viewport height is animated between the two measured step
  // heights as the strip slides, so it grows/shrinks with the active step.
  const chooserH = useSharedValue(0);
  const workbenchH = useSharedValue(0);

  useEffect(() => {
    const to = atDetail ? 1 : 0;
    progress.value = reduced
      ? to
      : withTiming(to, {
          duration: 280,
          easing: Easing.out(Easing.cubic),
        });
  }, [atDetail, reduced, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -progress.value * stripWidth.value }],
  }));

  // Viewport height tracks the slide: chooser height at p=0, workbench at p=1.
  // Falls back to whichever is known until both have measured.
  const viewportStyle = useAnimatedStyle(() => {
    const a = chooserH.value;
    const b = workbenchH.value;
    if (!a && !b) return {};
    const h = a + (b - a) * progress.value;
    return { height: h || a || b };
  });

  // First tap on a dated verb slides to the workbench; tapping the other dated
  // verb switches kind in place (the WHEN grammar is shared, so the picked when
  // carries across). Commit lives in the corner glyph. Choosing a dated door
  // closes the note rail — only one workbench occupies step 2 at a time.
  function selectDated(kind: DatedKind): void {
    setSelected(kind);
    if (picking) onTogglePicking();
  }

  // The back chevron — slide home to the chooser, abandoning the in-progress
  // workbench without filing. Clears whichever step-2 occupant was open.
  function back(): void {
    if (selected) setSelected(null);
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

  // Detail-panel accent — the selected type's bright code (reads on the bar).
  const accent = verbColor(selected ?? "todo");
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
      // The scheme-aware interface slab — the one surface that reads as INTERFACE,
      // lifted off the field. Light paper in light mode, graphite in dark; no type
      // tint: nothing here belongs to one type.
      style={[styles.card, { backgroundColor: BAR }, tokens.elevation.capture]}
    >
      {/* The viewport — clips the 2-wide track so only one step shows. Its width
          is measured to drive the slide distance; its height is animated to the
          active step. */}
      <Animated.View
        style={[styles.viewport, viewportStyle]}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          stripWidth.value = w;
          setStripWidthPx(w);
        }}
      >
        <Animated.View style={[styles.track, trackStyle]}>
          {/* ── Step 1 · CHOOSER — the captured thought + the four doors. ── */}
          <View
            style={[styles.step, { width: stripWidthPx, left: 0 }]}
            onLayout={(e) => {
              chooserH.value = e.nativeEvent.layout.height;
            }}
          >
            <View style={styles.body}>
              {/* The pen-mark + echo are the quiet subject line; the verbs are
                  the decision. The corner glyph here is always the discard ✕ —
                  commit moves to the workbench step. */}
              <View style={styles.echoRow}>
                <PenLine color={BAR_INK_MUTED} size={16} />
                <ThemedText
                  type="body"
                  numberOfLines={1}
                  style={[styles.echo, { color: BAR_INK_MUTED }]}
                >
                  {text}
                </ThemedText>
                <Pressable
                  onPress={onDismiss}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Discard this thought"
                  style={({ pressed }) => [
                    styles.corner,
                    pressed && { opacity: 0.5 },
                  ]}
                >
                  <IconSymbol name="close" size={16} color={BAR_INK_MUTED} />
                </Pressable>
              </View>

              {/* The verb line — the primary choice, read not tapped-at. Each
                  word in its bright type code on the bar; the picked dated
                  verb is bold + underlined. The four doors stand equal: the color
                  belongs to the choice, never to the chrome. */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.verbLine}
              >
                <ResolverVerb
                  label="Keep"
                  color={verbColor("idea")}
                  onPress={() => onResolve({ kind: "idea" })}
                  accessibilityLabel="Keep as idea"
                />
                <ResolverSep color={BAR_INK_MUTED} />
                <ResolverVerb
                  label="do it"
                  color={verbColor("todo")}
                  selected={selected === "todo"}
                  onPress={() => selectDated("todo")}
                  accessibilityLabel="Make it a to-do"
                  accessibilityState={{ selected: selected === "todo" }}
                />
                <ResolverSep color={BAR_INK_MUTED} />
                <ResolverVerb
                  label="by a date"
                  color={verbColor("deadline")}
                  selected={selected === "deadline"}
                  onPress={() => selectDated("deadline")}
                  accessibilityLabel="Make it a deadline"
                  accessibilityState={{ selected: selected === "deadline" }}
                />
                <ResolverSep color={BAR_INK_MUTED} />
                <ResolverVerb
                  label="note"
                  color={BAR_INK_MUTED}
                  selected={picking}
                  // No recent ideas to link onto → file as a free note
                  // immediately. Otherwise slide to the note rail.
                  onPress={() =>
                    ideas.length > 0
                      ? onTogglePicking()
                      : onResolve({ kind: "note" })
                  }
                  accessibilityLabel="File as diary note"
                  accessibilityState={{ expanded: picking }}
                />
              </ScrollView>
            </View>
          </View>

          {/* ── Step 2 · WORKBENCH — slides in from the right when a door is
              picked. A recessed well INSIDE the bar (one consistent slab in the
              active scheme), so configuring reads as a different register from
              choosing. Its header is the back chevron + the same echoed thought;
              the corner ✓ commits (dated only — note taps file immediately). ── */}
          <View
            style={[
              styles.step,
              styles.workbench,
              {
                width: stripWidthPx,
                left: stripWidthPx,
                backgroundColor: BAR_PANEL,
              },
            ]}
            onLayout={(e) => {
              workbenchH.value = e.nativeEvent.layout.height;
            }}
            // Keep step 2 out of the a11y tree while it's off-screen, so the back
            // chevron and value words aren't reachable from the chooser.
            accessibilityElementsHidden={!atDetail}
            importantForAccessibility={
              atDetail ? "auto" : "no-hide-descendants"
            }
            pointerEvents={atDetail ? "auto" : "none"}
          >
            <View style={styles.echoRow}>
              <Pressable
                onPress={back}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Back to choices"
                style={({ pressed }) => [
                  styles.corner,
                  pressed && { opacity: 0.5 },
                ]}
              >
                <IconSymbol
                  name="chevron-left"
                  size={20}
                  color={BAR_INK_MUTED}
                />
              </Pressable>
              <ThemedText
                type="body"
                numberOfLines={1}
                style={[styles.echo, { color: BAR_INK_MUTED }]}
              >
                {text}
              </ThemedText>
              {selected ? (
                <Pressable
                  onPress={() => commitDated(selected)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={
                    selected === "deadline" ? "Save deadline" : "Save to-do"
                  }
                  style={({ pressed }) => [
                    styles.corner,
                    pressed && { opacity: 0.5 },
                  ]}
                >
                  <IconSymbol name="check" size={20} color={accent} />
                </Pressable>
              ) : (
                <View style={styles.corner} />
              )}
            </View>

            {/* Note rail — free note (left) + linkable ideas (right). Shown when
                "note" opened the workbench. */}
            {picking ? (
              <View style={styles.noteRail}>
                {/* Free note — fixed on the left. A note with no idea behind it. */}
                <Pressable
                  onPress={() => onResolve({ kind: "note" })}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="File as a free note"
                  style={({ pressed }) => [
                    styles.freeNoteChip,
                    { backgroundColor: BAR_CHIP },
                    pressed && { opacity: 0.5 },
                  ]}
                >
                  <ThemedText
                    type="micro"
                    style={[styles.freeNoteLabel, { color: BAR_INK_MUTED }]}
                  >
                    free note
                  </ThemedText>
                </Pressable>

                {/* Linkable ideas — scrollable on the right. */}
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
                        style={[styles.ideaLabel, { color: BAR_INK }]}
                      >
                        {idea.title}
                      </ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Dated detail — WHEN / PROJECT readouts for the selected dated
                verb. Inline value words, same language as the chooser. */}
            {selected ? (
              <View style={styles.detail}>
                {/* WHEN — one shared grammar for todo + deadline: concrete days
                    and closing horizons as inline tappable words. "exact"
                    reveals the precise day/time stepper. */}
                <ValueRow label="WHEN" keyColor={BAR_INK_MUTED}>
                  {WHEN_OPTIONS.map((o) =>
                    o.kind === "concrete" ? (
                      <ResolverValue
                        key={o.label}
                        label={o.label}
                        color={accent}
                        mutedColor={BAR_INK_MUTED}
                        selected={
                          !exact && dueRange === null && date === o.date()
                        }
                        onPress={() => {
                          setExact(false);
                          setDueRange(null);
                          setDate(o.date());
                          setTime("");
                        }}
                      />
                    ) : (
                      <ResolverValue
                        key={o.label}
                        label={o.label}
                        color={accent}
                        mutedColor={BAR_INK_MUTED}
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
                  <ResolverValue
                    label="exact"
                    color={accent}
                    mutedColor={BAR_INK_MUTED}
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
                    inkColor={BAR_INK}
                    mutedColor={BAR_INK_MUTED}
                    onDateChange={setDate}
                    onTimeChange={setTime}
                  />
                ) : dueRange ? (
                  <ThemedText type="micro" style={{ color: BAR_INK_MUTED }}>
                    {selected === "deadline" ? "Close it" : "Land it"}{" "}
                    {horizonLabel(dueRange)} — by {horizonEndDate(dueRange)}.
                  </ThemedText>
                ) : null}

                {/* PROJECT — attribution as inline words. Hidden when:
                    - no projects exist, OR
                    - the resolver is locked (summoned from a project surface,
                      so the attribution is implied; the echo line below
                      already shows the project name). */}
                {!lockedProjectId && activeProjects.length > 0 ? (
                  <ValueRow label="PROJECT" keyColor={BAR_INK_MUTED}>
                    <ResolverValue
                      label="unfiled"
                      color={accent}
                      mutedColor={BAR_INK_MUTED}
                      selected={projectId === null}
                      onPress={() => setProjectId(null)}
                    />
                    {activeProjects.map((p) => (
                      <ResolverValue
                        key={p.id}
                        label={p.title}
                        color={accent}
                        mutedColor={BAR_INK_MUTED}
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
                  <ThemedText type="mono" style={{ color: BAR_INK_MUTED }}>
                    {selected === "deadline" ? "Deadline" : "To-do"} ·
                  </ThemedText>
                  <ThemedText type="hand" style={{ color: BAR_INK_MUTED }}>
                    {projectName}
                  </ThemedText>
                </View>
              </View>
            ) : null}
          </View>
        </Animated.View>
      </Animated.View>
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

const styles = StyleSheet.create({
  // The interface bar — one neutral object lifted off the field, scheme-aware
  // (surface set at runtime). Sharp instrument corner, no type-tinted edge:
  // nothing here belongs to one type.
  card: {
    borderRadius: tokens.radius.lg,
    overflow: "hidden",
    marginBottom: tokens.space.sm,
  },
  body: {
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.xs,
  },
  // The subject line: pen-mark · echoed thought · corner glyph. Quiet, recessive
  // — it's what you're filing, not the decision. The verbs below are the decision.
  echoRow: {
    flexDirection: "row",
    alignItems: "center",
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
  // The carousel viewport — clips the 2-wide track to one step. Its height is
  // animated to the active step (see `viewportStyle`) so the strip never reserves
  // the taller workbench's height while the chooser is showing.
  viewport: {
    overflow: "hidden",
  },
  // The 2-wide track holding both steps side by side; translated to slide.
  track: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  // Each carousel step. Step 2 is positioned absolutely just past step 1 so only
  // step 1 contributes to the in-flow height; the viewport height is animated
  // between the two measured step heights.
  step: {
    position: "absolute",
    top: 0,
  },
  // The workbench — step 2. A recessed well inside the bar, so configuring reads
  // as a different register from choosing while staying one consistent slab in
  // the active scheme.
  workbench: {
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.sm,
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
  noteRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
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
  },
});
