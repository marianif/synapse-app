import { FlatList, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";

import { DispatchRow } from "@/components/molecules/dispatch-row";
import { EmptyState } from "@/components/molecules/empty-state";
import { tokens, useTheme } from "@/constants/theme";

import type { Dispatch } from "@/lib/agenda-voice";

/**
 * The feed: the board's dispatches, loudest first. A flat stream with no
 * sections, no filters, and no "today" cut — an RSS reader for your own life,
 * where every line is a fact about time and a way back into the thing it names.
 *
 * The list is deliberately shallow (the voice caps itself at ~14 lines), so
 * FlatList is here for the row recycling and the stable keys, not for
 * virtualizing thousands of rows.
 */

interface AgendaFeedProps {
  dispatches: Dispatch[];
  onSelect: (dispatch: Dispatch) => void;
  /** Rendered above the first dispatch — the screen's spine. */
  header?: React.ReactElement;
  /** Clears the tab bar and the resting capture dock. */
  bottomInset: number;
}

/** Entrance stagger, capped so the last line never feels late. */
const STAGGER_MS = 45;
const STAGGER_CAP = 8;

export function AgendaFeed({
  dispatches,
  onSelect,
  header,
  bottomInset,
}: AgendaFeedProps): React.ReactElement {
  const reduced = useReducedMotion();
  const { colors } = useTheme();

  return (
    <FlatList
      data={dispatches}
      keyExtractor={(d) => d.id}
      ListHeaderComponent={header}
      renderItem={({ item, index }) => (
        <Animated.View
          // The feed prints itself in, line by line, like a page being written.
          // A calm timing fade on the standard exit bezier — no spring, no
          // overshoot. Reduced motion gets the finished page instead.
          entering={
            reduced
              ? undefined
              : FadeInDown.delay(Math.min(index, STAGGER_CAP) * STAGGER_MS)
                  .duration(tokens.motion.duration.base)
                  .easing(Easing.bezier(...tokens.motion.bezier))
          }
        >
          <DispatchRow dispatch={item} onPress={onSelect} />
        </Animated.View>
      )}
      ItemSeparatorComponent={Separator}
      ListEmptyComponent={
        <EmptyState
          title="The board has nothing to say."
          description="Nothing is running out and nothing has gone quiet. Put something in and it starts talking."
          accentColor={colors.inkMuted}
        />
      }
      contentContainerStyle={[
        styles.content,
        { paddingBottom: bottomInset + tokens.space.xxxl },
      ]}
      showsVerticalScrollIndicator={false}
    />
  );
}

/**
 * Breathing room, not a rule. DESIGN.md forbids 1px structural borders — the
 * spacing and the dot gutter carry the separation between dispatches.
 */
function Separator(): React.ReactElement {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: tokens.space.lg,
  },
  separator: {
    height: tokens.space.sm,
  },
});
