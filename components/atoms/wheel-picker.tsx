import { useEffect, useRef } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

// A single-column snap wheel with a centered selection band: the selected row is
// bold ink at full opacity in the middle; rows fade as they move away from center.
// Built in JS (snapToInterval + scroll math) — no native module, no prebuild.

export const WHEEL_ROW_HEIGHT = 44;
const VISIBLE_ROWS = 5; // must be odd so one row sits dead-center
const PADDING_ROWS = (VISIBLE_ROWS - 1) / 2;

export type WheelItem = {
  /** Stable key + the value reported on select. */
  value: string;
  /** Primary text (the day name / hour). */
  label: string;
  /** Optional secondary text shown right-aligned (the resolved date / minute). */
  detail?: string;
};

type WheelPickerProps = {
  items: WheelItem[];
  selectedValue: string;
  onChange: (value: string) => void;
  accentColor: string;
  /** Left-align label + right-align detail (day wheel) vs centered (time wheel). */
  align?: "split" | "center";
  /** Flex weight when sat next to another wheel. */
  flex?: number;
};

export function WheelPicker({
  items,
  selectedValue,
  onChange,
  accentColor,
  align = "center",
  flex = 1,
}: WheelPickerProps): React.ReactElement {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(
    0,
    items.findIndex((i) => i.value === selectedValue),
  );

  // Keep the wheel parked on the selected row when it changes from outside
  // (e.g. a quick-pick chip), without fighting an in-progress drag.
  const isDragging = useRef(false);
  useEffect(() => {
    if (isDragging.current) return;
    scrollRef.current?.scrollTo({
      y: selectedIndex * WHEEL_ROW_HEIGHT,
      animated: true,
    });
  }, [selectedIndex]);

  function handleMomentumEnd(
    e: NativeSyntheticEvent<NativeScrollEvent>,
  ): void {
    isDragging.current = false;
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / WHEEL_ROW_HEIGHT);
    const clamped = Math.min(Math.max(index, 0), items.length - 1);
    const next = items[clamped];
    if (next && next.value !== selectedValue) onChange(next.value);
  }

  return (
    <View style={[styles.wheel, { flex }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ROW_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled
        contentContainerStyle={{
          paddingVertical: PADDING_ROWS * WHEEL_ROW_HEIGHT,
        }}
        onScrollBeginDrag={() => {
          isDragging.current = true;
        }}
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollEndDrag={handleMomentumEnd}
      >
        {items.map((item, i) => {
          const distance = Math.abs(i - selectedIndex);
          const active = i === selectedIndex;
          // Fade with distance from the center band.
          const opacity = active ? 1 : distance === 1 ? 0.5 : 0.25;
          return (
            <Pressable
              key={item.value}
              onPress={() => onChange(item.value)}
              accessibilityRole="button"
              accessibilityLabel={
                item.detail ? `${item.label}, ${item.detail}` : item.label
              }
              accessibilityState={{ selected: active }}
              style={[
                styles.row,
                align === "split" && styles.rowSplit,
                align === "center" && styles.rowCenter,
              ]}
            >
              <ThemedText
                type="item"
                numberOfLines={1}
                style={[
                  { opacity },
                  active && { color: accentColor, fontWeight: "700" },
                  !active && { color: colors.ink },
                ]}
              >
                {item.label}
              </ThemedText>
              {item.detail != null && (
                <ThemedText
                  type="mono"
                  numberOfLines={1}
                  style={[
                    { opacity },
                    active
                      ? { color: accentColor, fontWeight: "700" }
                      : { color: colors.inkMuted },
                  ]}
                >
                  {item.detail}
                </ThemedText>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wheel: {
    height: WHEEL_ROW_HEIGHT * VISIBLE_ROWS,
  },
  row: {
    height: WHEEL_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
  },
  rowSplit: {
    justifyContent: "space-between",
    paddingHorizontal: tokens.space.md,
  },
  rowCenter: {
    justifyContent: "center",
  },
});
