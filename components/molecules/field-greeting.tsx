import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { FieldSummary } from "@/components/molecules/field-summary";
import { tokens, useTheme } from "@/constants/theme";

import type { FieldRowItem } from "@/components/molecules/field-row";

/**
 * The home's "greetings" block. A quiet kicker (today's date, plus a seasonal
 * read of the light in the handwritten narrative voice), the time-of-day display
 * greeting, then a body line that swaps with state:
 *
 *  • empty — a nudge to capture the first thing.
 *  • else  — the FieldSummary roll-up of stakes + present.
 *
 * Pure: hand it the greeting, the pre-formatted date + seasonal clause, and the
 * two row streams; it renders, deriving nothing time-bound of its own.
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

type Season = "winter" | "spring" | "summer" | "autumn";
type Part = "morning" | "afternoon" | "evening";

// Northern-hemisphere seasons by 0-indexed month.
function seasonOf(month: number): Season {
  if (month === 11 || month === 0 || month === 1) return "winter";
  if (month <= 4) return "spring";
  if (month <= 7) return "summer";
  return "autumn";
}

// Morning 5–11, afternoon 12–17, evening 18–4.
function partOf(hour: number): Part {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

// A small observational pool per season × part — a warmer seasonal read of the
// light, still factual, never cozy. Two variants each; chosen deterministically.
const SEASONAL: Record<Season, Record<Part, [string, string]>> = {
  winter: {
    morning: ["a thin, pale winter morning", "the light comes late and low"],
    afternoon: [
      "a short, bright winter afternoon",
      "the cold's gone sharp and honest",
    ],
    evening: [
      "a long winter evening, already dark",
      "the dark settles in early",
    ],
  },
  spring: {
    morning: [
      "a clean, rising spring morning",
      "the light's getting longer again",
    ],
    afternoon: [
      "a loose, open spring afternoon",
      "the air's turned soft and green",
    ],
    evening: [
      "a slow spring evening, light still holding",
      "the day lets go slowly now",
    ],
  },
  summer: {
    morning: ["a bright, wide summer morning", "the long light of deep summer"],
    afternoon: [
      "a full, still summer afternoon",
      "the heat sits heavy and slow",
    ],
    evening: [
      "a warm summer evening, late light",
      "the sun's in no hurry to leave",
    ],
  },
  autumn: {
    morning: [
      "a crisp, clear autumn morning",
      "the light's gone thin and gold",
    ],
    afternoon: [
      "a bronze, tapering autumn afternoon",
      "the year's tilting toward dark",
    ],
    evening: [
      "a cool autumn evening drawing in",
      "the dark comes on a little sooner",
    ],
  },
};

/**
 * A seasonal × time-of-day observation for the kicker — returned WITHOUT a
 * leading dash. Pure and deterministic: derived from month + hour, no clocks or
 * randomness, so the same moment always reads the same clause.
 */
export function seasonalNote(month: number, hour: number): string {
  const season = seasonOf(month);
  const part = partOf(hour);
  const pair = SEASONAL[season][part];
  // Deterministic pick from the passed-in values — no Math.random / Date.now.
  return pair[(month + hour) % 2];
}

interface FieldGreetingProps {
  /** Greeting line, already time-resolved by the parent (keeps this pure). */
  greeting: string;
  /** Today's date, pre-formatted normal-case by the parent (e.g. "Wednesday, 2 July"). */
  dateLabel: string;
  /** Seasonal clause (no leading dash), computed by the parent via seasonalNote. */
  seasonalNote: string;
  /** STAKES rows (deadline/todo). */
  stakes: FieldRowItem[];
  /** PRESENT rows (ideas). */
  present: FieldRowItem[];
}

export function FieldGreeting({
  greeting,
  dateLabel,
  seasonalNote,
  stakes,
  present,
}: FieldGreetingProps): React.ReactElement {
  const { colors } = useTheme();

  // The board is clear when there are no stakes and nothing present. Empty shows
  // the capture nudge; populated swaps it for the field summary.
  const empty = stakes.length === 0 && present.length === 0;

  return (
    <View style={styles.head}>
      {/* Date + a seasonal read of the light — the normal-case date in a quiet
          body voice, then the observation in the handwritten narrative voice. */}
      <View style={styles.kicker}>
        <ThemedText
          type="body"
          style={[styles.date, { color: colors.inkMuted }]}
        >
          {dateLabel}
        </ThemedText>
        <ThemedText type="hand" style={{ color: colors.inkMuted }}>
          {`— ${seasonalNote}`}
        </ThemedText>
      </View>

      {empty ? (
        <ThemedText
          type="body"
          style={[styles.thesis, { color: colors.inkMuted }]}
        >
          Nothing on the board yet. Tap a life area to get the first thing out
          of your head.
        </ThemedText>
      ) : (
        <FieldSummary stakes={stakes} present={present} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    gap: tokens.space.md,
    paddingHorizontal: tokens.space.xs,
  },
  kicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: tokens.space.xs,
    marginBottom: -tokens.space.xs,
  },
  date: {
    fontSize: 14,
    lineHeight: 20,
  },
  // The greeting is the home's loudest word — sized a step above the display
  // token so it lands before the narrative voice and the zones below it.
  greeting: {
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.4,
  },
  thesis: {
    marginTop: -tokens.space.xs,
    paddingRight: tokens.space.md,
  },
});
