import { Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { tokens } from "@/constants/theme";
import type { UseCaptureReturn } from "@/hooks/use-capture";

export function isDockDismissible(cap: UseCaptureReturn): boolean {
  return cap.composerOpen || cap.isRecording;
}

/**
 * Full-screen scrim behind the lifted capture dock. Without it the dock's
 * slab shares `colors.surface`/`colors.accent.clay` with cards sitting right
 * behind it (the field, project cards), so an active dock visually fuses with
 * the content underneath. The scrim separates "acting on the dock" from "the
 * field behind it" the same way sheet backdrops (`scrim.strong`) separate a
 * sheet from the screen — `scrim.medium` here since the dock is a lighter,
 * non-modal lift rather than a full sheet takeover.
 */
export function CaptureBackdrop({
  cap,
}: {
  cap: UseCaptureReturn;
}): React.ReactElement | null {
  if (!isDockDismissible(cap)) return null;

  const dismiss = (): void => {
    if (cap.isRecording) void cap.cancelRecording();
    cap.setComposerOpen(false);
  };

  return (
    <Animated.View
      entering={FadeIn.duration(tokens.motion.duration.fast)}
      exiting={FadeOut.duration(tokens.motion.duration.fast)}
      style={StyleSheet.absoluteFill}
    >
      <Pressable
        style={[StyleSheet.absoluteFill, styles.scrim]}
        onPress={dismiss}
        accessibilityLabel="Dismiss capture"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: tokens.color.scrim.medium,
  },
});
