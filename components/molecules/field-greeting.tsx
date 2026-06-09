import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { FieldSummary } from "@/components/molecules/field-summary";
import { useTheme, tokens } from "@/constants/theme";

import { CHANNELS } from "@/components/organisms/field-console/channels";
import { FocusLine, segmentsFor } from "@/components/organisms/field-console/focus-line";

import type { FieldRowItem, Heat } from "@/components/molecules/field-row";
import type { EntryType } from "@/lib/types";

/**
 * The orbit console's header — the "greetings" block. It carries the metaphor in
 * words before the SVG ring does in shape: an instrument-panel kicker (idle orbit
 * count, focused channel, or live "pressing · in field" readout), the time-of-day
 * display greeting, then a body line that swaps with the field's state:
 *
 *  • empty   — the "your whole brain's in orbit" thesis.
 *  • focused — the companion's spoken read of the poked channel (FocusLine).
 *  • else    — the FieldSummary roll-up of stakes + present.
 *
 * Autonomous: hand it the greeting, the two row streams, and which channel (if
 * any) is focused, and it derives its own readout. signalFor lives here because
 * the header owns the per-type rollup; the orbit body imports it back for its dots.
 */

/**
 * Time-of-day greeting — the words the display line shows. Lives with the
 * greeting molecule so all greeting copy sits in one place; exported for any
 * surface that wants to echo the same voice.
 */
export function greetingFor(hour: number): string {
  if (hour < 5) return "Still up.";
  if (hour < 12) return "Good morning.";
  if (hour < 18) return "Good afternoon.";
  return "Good evening.";
}

/** Aggregate read of one orbiting type once the field has signal. */
export type TypeSignal = {
  count: number;
  /** Hottest heat present in this type — drives the glow halo. */
  heat: Heat;
  /** This channel's own rows, in field order — named when it's focused. */
  rows: FieldRowItem[];
};

const HEAT_RANK: Record<Heat, number> = { hot: 3, warm: 2, cool: 1 };

/** Roll the field's rows up into a per-type count + peak heat + the rows
    themselves, so a focused channel can name its real contents. */
export function signalFor(type: EntryType, rows: FieldRowItem[]): TypeSignal {
  const own: FieldRowItem[] = [];
  let peak = 0;
  for (const r of rows) {
    if (r.type !== type) continue;
    own.push(r);
    peak = Math.max(peak, HEAT_RANK[r.heat]);
  }
  const heat: Heat = peak >= 3 ? "hot" : peak === 2 ? "warm" : "cool";
  return { count: own.length, heat, rows: own };
}

interface FieldGreetingProps {
  /** Greeting line, already time-resolved by the parent (keeps this pure). */
  greeting: string;
  /** STAKES rows (deadline/todo). */
  stakes: FieldRowItem[];
  /** PRESENT rows (idea/event/someday). */
  present: FieldRowItem[];
  /** Which channel the companion is reading aloud, or null. */
  focusedType: EntryType | null;
}

export function FieldGreeting({
  greeting,
  stakes,
  present,
  focusedType,
}: FieldGreetingProps): React.ReactElement {
  const { scheme, colors } = useTheme();

  const n = CHANNELS.length;

  // The field is clear when there are no stakes and nothing present. Empty keeps
  // the "brain's in orbit" thesis; populated swaps it for the field summary.
  const empty = stakes.length === 0 && present.length === 0;

  const rows = [...stakes, ...present];
  const signals = CHANNELS.map((c) => signalFor(c.type, rows));

  // Live instrument readout: how many types carry pressing (hot) signal, and the
  // total in the field — replacing the idle "5 in orbit · 0 landed".
  const pressing = signals.filter((s) => s.heat === "hot" && s.count > 0).length;
  const inField = rows.length;

  // The focused channel's rows, if any. Focus only "takes" when the channel
  // still has something to read — a channel that's since emptied (or never had
  // rows) yields no segments, so the header falls back to the field summary.
  const focusedSignal = focusedType
    ? signals[CHANNELS.findIndex((c) => c.type === focusedType)]
    : null;
  const hasFocus =
    !!focusedType &&
    !!focusedSignal &&
    segmentsFor(focusedType, focusedSignal.rows) !== null;

  return (
    <View style={styles.head}>
      {/* Instrument-panel readout — names the idle orbit state in the mono
          signal voice, so the header carries the metaphor before the SVG. */}
      <ThemedText
        type="label"
        style={[styles.kicker, { color: colors.inkMuted }]}
      >
        {empty
          ? `${n} in orbit · 0 landed`
          : hasFocus
            ? `${focusedType} · tap again to clear`
            : `${pressing} pressing · ${inField} in field`}
      </ThemedText>
      <ThemedText type="display" style={{ color: colors.ink }}>
        {greeting}
      </ThemedText>
      {empty ? (
        <ThemedText
          type="body"
          style={[styles.thesis, { color: colors.inkMuted }]}
        >
          Your whole brain&apos;s in orbit. Pull the first thing down into the
          field.
        </ThemedText>
      ) : hasFocus ? (
        // The companion's read of the poked channel — same muted-body voice as
        // the field summary, with the real items lifted in the agenda hand.
        <FocusLine
          type={focusedType!}
          rows={focusedSignal!.rows}
          scheme={scheme}
          muted={colors.inkMuted}
        />
      ) : (
        <FieldSummary stakes={stakes} present={present} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.xs,
  },
  kicker: {
    marginBottom: -tokens.space.xs,
  },
  thesis: {
    marginTop: -tokens.space.xs,
    paddingRight: tokens.space.md,
  },
});
