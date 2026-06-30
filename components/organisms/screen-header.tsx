import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EntryCluster } from "@/components/atoms/entry-cluster";
import { SketchIcon } from "@/components/atoms/sketch-icon";
import { ThemedText } from "@/components/atoms/themed-text";
import { entryColor, tokens, useTheme } from "@/constants/theme";

import type { EntryType } from "@/lib/types";

/** Types shown as the small cluster in the all-types "Incoming" header. */
const INCOMING_CLUSTER: EntryType[] = ["deadline", "todo", "idea"];

interface ScreenHeaderProps {
  title: string;
  /** Mono kicker under the title, e.g. "DEADLINES" / "INCOMING". */
  kicker?: string;
  /**
   * The type whose lane this is. Drives the leading sketch glyph + hue so the
   * header reads as the tile you tapped, opened up. Omit for the mixed
   * "Incoming" view, which shows a multi-type dot cluster instead.
   */
  entryType?: EntryType;
  /**
   * A custom leading glyph (e.g. <CalendarIcon />) for non-entry screens.
   * Ignored when `entryType` is set; falls back to the Incoming cluster when
   * neither is provided.
   */
  glyph?: React.ReactNode;
  onBack?: () => void;
  /**
   * Add the top safe-area inset + a paper background. Set when this is mounted
   * as a navigator `header` (expo-router Stack), where no SafeAreaView wraps it.
   * Leave off when rendered inside a screen that already owns its top inset.
   */
  inset?: boolean;
  /**
   * Optional right-side action(s) — typically a single icon button such as
   * a `··` overflow menu. Sits flush with the trailing edge of the header,
   * mirroring the back button on the left so the row stays balanced.
   */
  headerRight?: React.ReactNode;
}

/**
 * Stack-screen header — the opened screen's spine. Shared across the focus
 * lanes (list / Incoming), the calendar, and detail.
 *
 * Single-type: leads with the type's hand-drawn SketchIcon in its own hue, so
 * the lane keeps the identity of the tile that launched it. Custom screens pass
 * a `glyph` (e.g. the brand CalendarIcon). All-types ("Incoming"): a small dot
 * cluster of the upcoming types, because no single type owns the screen.
 *
 * Layout: [back] [glyph/cluster + title + mono kicker]
 */
export function ScreenHeader({
  title,
  kicker,
  entryType,
  glyph,
  onBack,
  inset = false,
  headerRight,
}: ScreenHeaderProps): React.ReactElement {
  const { colors } = useTheme();
  const safeArea = useSafeAreaInsets();
  const accent = entryType ? entryColor(entryType) : colors.ink;

  return (
    <View
      style={[
        styles.header,
        inset && {
          paddingTop: safeArea.top + tokens.space.md,
          backgroundColor: colors.paper,
        },
      ]}
    >
      <Pressable
        onPress={onBack}
        hitSlop={12}
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={28}
          color={colors.ink}
        />
      </Pressable>

      <View style={styles.identity}>
        <View style={styles.glyphSlot}>
          {entryType ? (
            <SketchIcon type={entryType} size={26} />
          ) : glyph ? (
            glyph
          ) : (
            <EntryCluster
              types={INCOMING_CLUSTER}
              dotSize={7}
              gap={3}
              width={24}
            />
          )}
        </View>
        <View style={styles.titleBlock}>
          <ThemedText type="headline" numberOfLines={1} style={styles.title}>
            {title}
          </ThemedText>
          {kicker ? (
            <ThemedText
              type="micro"
              style={[
                styles.kicker,
                { color: entryType ? accent : colors.inkMuted },
              ]}
              numberOfLines={1}
            >
              {kicker}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {headerRight ? <View style={styles.rightSlot}>{headerRight}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    gap: tokens.space.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  identity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
  },
  glyphSlot: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
    gap: 1,
  },
  title: {
    flexShrink: 1,
  },
  kicker: {
    letterSpacing: tokens.type.kicker.tracking,
  },
  rightSlot: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
  },
});
