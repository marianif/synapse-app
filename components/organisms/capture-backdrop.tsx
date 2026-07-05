import { Pressable, StyleSheet } from "react-native";

import type { UseCaptureReturn } from "@/hooks/use-capture";

export function isDockDismissible(cap: UseCaptureReturn): boolean {
  return cap.composerOpen || cap.isRecording;
}

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
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={dismiss}
      accessibilityLabel="Dismiss capture"
    />
  );
}
