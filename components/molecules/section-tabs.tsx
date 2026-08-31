import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

/** One tab in a SectionTabs row. */
export interface SectionTab<T extends string> {
  value: T;
  label: string;
  /** Optional live tally, set in mono beside the label. */
  count?: number;
  /** Optional active-underline accent — tints the rule instead of neutral ink. */
  accent?: string;
  /** Optional per-tab accessible name; defaults to the label. */
  accessibilityLabel?: string;
}

interface SectionTabsProps<T extends string> {
  value: T;
  options: SectionTab<T>[];
  onChange: (value: T) => void;
  /** Accessible name for the whole row (announced when rendered as a tablist). */
  accessibilityLabel: string;
  /** Label voice — editorial (Inter semi-bold) or mono (signal layer). */
  variant?: "editorial" | "mono";
  /** Render as an accessibility tablist/tab pair instead of plain buttons. */
  tabs?: boolean;
  /** Let the row wrap to a second line when it overflows. */
  wrap?: boolean;
}

/**
 * Editorial tab row — a line of section labels, the active one full-ink with a
 * thin underline rule, the rest muted with none. No pills, no fills. Optional
 * mono counts let a tab double as a live tally, and an optional `accent` tints
 * the active underline so a filter can speak the same color language as the
 * entries it narrows. Shared by the diary, direct, and list filter bars.
 */
export function SectionTabs<T extends string>({
  value,
  options,
  onChange,
  accessibilityLabel,
  variant = "editorial",
  tabs = false,
  wrap = false,
}: SectionTabsProps<T>): React.ReactElement {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.row, wrap && styles.wrap]}
      accessibilityRole={tabs ? "tablist" : undefined}
      accessibilityLabel={tabs ? accessibilityLabel : undefined}
    >
      {options.map((option) => {
        const active = value === option.value;
        const labelColor = active ? colors.ink : colors.inkMuted;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            hitSlop={8}
            accessibilityRole={tabs ? "tab" : "button"}
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            style={styles.tab}
          >
            <View style={styles.tabHeader}>
              <ThemedText
                type={variant === "mono" ? "mono" : undefined}
                style={[
                  variant === "editorial" ? styles.editorial : undefined,
                  { color: labelColor },
                ]}
              >
                {option.label}
              </ThemedText>
              {option.count !== undefined ? (
                <ThemedText type="mono" style={{ color: labelColor }}>
                  {option.count}
                </ThemedText>
              ) : null}
            </View>
            <View
              style={[
                styles.rule,
                {
                  backgroundColor: active
                    ? (option.accent ?? colors.ink)
                    : "transparent",
                },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: tokens.space.lg,
  },
  wrap: {
    flexWrap: "wrap",
  },
  tab: {
    alignItems: "flex-start",
    gap: 5,
  },
  tabHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: tokens.space.sm,
  },
  editorial: {
    fontFamily: tokens.type.fontInter.semiBold,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  rule: {
    alignSelf: "stretch",
    height: 2,
    borderRadius: tokens.radius.pill,
  },
});