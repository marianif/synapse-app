import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useRouter } from "expo-router";
import { StyleSheet, View, Pressable } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { entryColor, entryTint, tokens, useTheme } from "@/constants/theme";

import type { PresentItem } from "@/lib/present";
import type { Href } from "expo-router";

dayjs.extend(customParseFormat);

interface PresentVariantProps {
  items: PresentItem[];
  itemHref: (item: PresentItem) => Href;
}

/** Events carry a DD/MM/YYYY note — show it as a human date strip. */
function eventDate(note?: string): { day: string; rest: string } {
  if (!note) return { day: "", rest: "" };
  const d = dayjs(note, "DD/MM/YYYY");
  if (!d.isValid()) return { day: note, rest: "" };
  return { day: d.format("D MMM").toUpperCase(), rest: d.format("ddd") };
}

/**
 * Events mosaic — the one Present kind that HAS a shape (a date), so it gets
 * tiles instead of the formless cloud. Each tile leads with a mono date readout
 * and the event name; the violet type-edge marks it as an event at a glance.
 * Long names take a full-width tile, short ones pair up two-across — an irregular
 * grid, never a uniform card stack.
 */
export function PresentMosaic({
  items,
  itemHref,
}: PresentVariantProps): React.ReactElement {
  const router = useRouter();
  const { scheme, colors } = useTheme();

  return (
    <View style={styles.mosaic}>
      {items.map((item) => {
        const code = entryColor(item.type);
        const tint = entryTint(item.type, scheme);
        const { day, rest } = eventDate(item.note);
        const full = item.title.length > 20;
        return (
          <Pressable
            key={item.id}
            onPress={() => router.push(itemHref(item))}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}${day ? `, ${day}` : ""}`}
            style={({ pressed }) => [
              styles.tile,
              full ? styles.full : styles.half,
              { backgroundColor: tint },
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.edge, { backgroundColor: code }]} />
            <View style={styles.dateRow}>
              <ThemedText type="mono" style={{ color: code }}>
                {day}
              </ThemedText>
              {rest ? (
                <ThemedText type="caption" style={{ color: colors.inkMuted }}>
                  {rest}
                </ThemedText>
              ) : null}
            </View>
            <ThemedText
              type="item"
              numberOfLines={2}
              style={{ color: colors.ink }}
            >
              {item.title}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  mosaic: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
  },
  tile: {
    borderRadius: tokens.radius.md,
    overflow: "hidden",
    padding: tokens.space.md,
    paddingLeft: tokens.space.lg,
    gap: tokens.space.xs,
    minHeight: 76,
    justifyContent: "center",
  },
  half: {
    width: "48.5%",
  },
  full: {
    width: "100%",
  },
  edge: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: tokens.space.sm,
  },
  pressed: {
    opacity: 0.7,
  },
});
