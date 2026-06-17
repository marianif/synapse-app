import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";

export interface SectionHeaderProps {
  /** All-caps section kicker — e.g. "PROJECTS". */
  title: string;
  /** When set, renders a "see more ›" affordance routing to this href. */
  seeMoreHref?: Href;
  /** Voice-over label for the see-more link. Defaults to `See all ${title}`. */
  seeMoreLabel?: string;
  /** Layout-control menu (or any other right-side affordance) for the section. */
  controls?: React.ReactNode;
}

/**
 * Section header — kicker on the left, optional "see more ›" link + optional
 * controls slot on the right. The see-more link uses a softer voice (body /
 * lowercase) than the kicker so the two never read as the same affordance.
 */
export function SectionHeader({
  title,
  seeMoreHref,
  seeMoreLabel,
  controls,
}: SectionHeaderProps): React.ReactElement {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <ThemedText type="micro" style={{ color: colors.inkMuted }}>
        {title}
      </ThemedText>

      <View style={styles.right}>
        {seeMoreHref ? (
          <Link href={seeMoreHref} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={seeMoreLabel ?? `See all ${title}`}
              hitSlop={8}
              style={({ pressed }) => [
                styles.seeMore,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="body" style={{ color: colors.inkMuted }}>
                see more
              </ThemedText>
              <IconSymbol
                name="chevron-right"
                size={16}
                color={colors.inkMuted}
              />
            </Pressable>
          </Link>
        ) : null}
        {controls}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 28,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  seeMore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
