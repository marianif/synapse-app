import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";

export interface SectionHeaderProps {
  /** All-caps section kicker — e.g. "PROJECTS". */
  title: string;
  /** When set, renders an inline "see more" link routing to this href. */
  seeMoreHref?: Href;
  /**
   * Visible text for the see-more link — the count carries the information
   * ("8 projects"), the chevron just signals "tappable". When omitted, falls
   * back to the bare word "see more".
   */
  seeMoreText?: string;
  /** Voice-over label for the see-more link. Defaults to `See all ${title}`. */
  seeMoreA11yLabel?: string;
}

/**
 * Section header — kicker on the left, optional inline see-more on the right.
 * The see-more reads as plain text + chevron (no pill, no border) so it stays
 * a tier-2 affordance under the kicker. Pass a count-bearing string like
 * "8 projects" via `seeMoreText` to make the count itself the link.
 */
export function SectionHeader({
  title,
  seeMoreHref,
  seeMoreText,
  seeMoreA11yLabel,
}: SectionHeaderProps): React.ReactElement {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <ThemedText type="micro" style={{ color: colors.inkMuted }}>
        {title}
      </ThemedText>

      {seeMoreHref ? (
        <Link href={seeMoreHref} asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={seeMoreA11yLabel ?? `See all ${title}`}
            hitSlop={8}
            style={({ pressed }) => [styles.seeMore, pressed && styles.pressed]}
          >
            <ThemedText
              type="body"
              style={{
                color: colors.inkMuted,
              }}
            >
              {seeMoreText ?? "see more"}
              <IconSymbol
                name="ChevronRight"
                size={14}
                color={colors.inkMuted}
              />
            </ThemedText>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  seeMore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "red",
  },
  pressed: {
    opacity: 0.6,
  },
});
