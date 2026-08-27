import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import {
  WheelPicker,
  type WheelItem,
} from "@/components/atoms/wheel-picker";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { toDisplayDate } from "@/lib/date-utils";

// The precise "exact" control for the composer's details stage — a floating
// context-menu card instead of the old full-screen bottom sheet. Mirrors the
// WhenPicker vocabulary (split day wheel + centered time wheel, one leading
// selection dot) but at context-menu density: 3 visible rows, no header, no
  // quick options, no all-day — just a danger Cancel icon / Done.

const WHEEL_ROW_HEIGHT = 34;
const VISIBLE_ROWS = 3;
const CARD_WIDTH = 300;

// Day wheel spans ~3 months forward — enough for any near-term capture.
const DAY_SPAN = 90;
const DAY_ITEMS: WheelItem[] = Array.from({ length: DAY_SPAN }, (_, i) => {
  const d = dayjs().startOf("day").add(i, "day");
  const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.format("ddd");
  return {
    value: toDisplayDate(d.toDate()),
    label,
    detail: d.format("D MMM"),
  };
});

// Time wheel — every 15 minutes, AM/PM formatted.
const TIME_ITEMS: WheelItem[] = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const label = dayjs().hour(h).minute(m).format("h:mm A");
  return { value, label };
});

// Land on an existing day item (else today), and snap any stored time to the
// nearest 15-minute item so the wheel always has a highlighted row.
function seedDate(value: string): string {
  if (value && DAY_ITEMS.some((i) => i.value === value)) return value;
  return DAY_ITEMS[0].value;
}

function seedTime(value: string): string {
  if (!value) return "09:00";
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "09:00";
  const total = h * 60 + m;
  const quarter = ((Math.round(total / 15) * 15) % 1440 + 1440) % 1440;
  const hh = String(Math.floor(quarter / 60)).padStart(2, "0");
  const mm = String(quarter % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export interface ExactDateMenuProps {
  visible: boolean;
  initialDate?: string;
  initialTime?: string;
  /** Entry-type tint — colors the selection dot + active wheel rows. */
  accentColor: string;
  /** Window rect of the composer pill, measured when the menu is opened. */
  anchor?: { x: number; y: number; w: number; h: number } | null;
  onDismiss: () => void;
  onConfirm: (date: string, time: string) => void;
}

export function ExactDateMenu({
  visible,
  initialDate = "",
  initialTime = "",
  accentColor,
  anchor,
  onDismiss,
  onConfirm,
}: ExactDateMenuProps): React.ReactElement {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const [date, setDate] = useState(() => seedDate(initialDate));
  const [time, setTime] = useState(() => seedTime(initialTime));
  const [overlaySize, setOverlaySize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!visible) return;
    setDate(seedDate(initialDate));
    setTime(seedTime(initialTime));
  }, [visible, initialDate, initialTime]);

  // The card floats just above the composer pill and shares its right edge.
  const bottom =
    anchor && overlaySize.h > 0
      ? overlaySize.h - anchor.y + tokens.space.sm
      : 96;
  const right =
    anchor && overlaySize.w > 0
      ? Math.max(0, overlaySize.w - anchor.x - anchor.w)
      : Math.max(0, (overlaySize.w - CARD_WIDTH) / 2);

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onDismiss}
      accessibilityViewIsModal
    >
      <View
        style={styles.overlay}
        onLayout={(e) =>
          setOverlaySize({
            w: e.nativeEvent.layout.width,
            h: e.nativeEvent.layout.height,
          })
        }
      >
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(120)}
          style={[StyleSheet.absoluteFill, styles.backdrop]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss date picker"
          />
        </Animated.View>

        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(160)}
          style={[
            styles.card,
            { backgroundColor: colors.accent.clay, right, bottom },
            tokens.elevation.menu,
          ]}
        >
          {/* A single leading dot marks the center row both wheels snap into. */}
          <View
            pointerEvents="none"
            style={[
              styles.selectionDot,
              { backgroundColor: colors.accent.onClay },
            ]}
          />
          <View style={styles.wheelRow}>
            <WheelPicker
              items={DAY_ITEMS}
              selectedValue={date}
              onChange={setDate}
              accentColor={accentColor}
              selectedColor={colors.accent.onClay}
              textColor={colors.accent.onClay}
              mutedColor={colors.accent.onClay}
              align="split"
              flex={1.4}
              rowHeight={WHEEL_ROW_HEIGHT}
              visibleRows={VISIBLE_ROWS}
            />
            <WheelPicker
              items={TIME_ITEMS}
              selectedValue={time}
              onChange={setTime}
              accentColor={accentColor}
              selectedColor={colors.accent.onClay}
              textColor={colors.accent.onClay}
              mutedColor={colors.accent.onClay}
              align="center"
              flex={1}
              rowHeight={WHEEL_ROW_HEIGHT}
              visibleRows={VISIBLE_ROWS}
            />
          </View>

          <View style={styles.footer}>
            <Pressable
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={({ pressed }) => [
                styles.cancel,
                { backgroundColor: colors.feedback.dangerTint[scheme] },
                pressed && styles.pressed,
              ]}
            >
              <IconSymbol
                name="Trash2"
                size={18}
                color={colors.feedback.danger}
              />
            </Pressable>
            <Pressable
              onPress={() => onConfirm(date, time)}
              accessibilityRole="button"
              accessibilityLabel="Confirm date and time"
              style={({ pressed }) => [
                styles.done,
                {
                  backgroundColor: pressed
                    ? colors.accent.clayPressed
                    : colors.accent.onClay,
                },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                type="bodyBold"
                style={{ color: colors.accent.clay }}
              >
                Done
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: tokens.color.scrim.medium,
  },
  card: {
    position: "absolute",
    width: CARD_WIDTH,
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.space.sm,
  },
  selectionDot: {
    position: "absolute",
    left: tokens.space.md,
    top:
      tokens.space.sm +
      WHEEL_ROW_HEIGHT +
      (WHEEL_ROW_HEIGHT - 8) / 2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  wheelRow: {
    flexDirection: "row",
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.sm,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.sm,
    paddingTop: tokens.space.sm,
    paddingHorizontal: tokens.space.lg,
  },
  cancel: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  done: {
    paddingHorizontal: tokens.space.xl,
    minHeight: 36,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
