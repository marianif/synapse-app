import { forwardRef } from "react";

import { CaptureFlow } from "@/components/organisms/capture-flow";
import { DockShell } from "@/components/organisms/dock-shell";
import type { InputStageHandle } from "@/components/organisms/input-stage-view";
import type { UseCaptureReturn } from "@/hooks/use-capture";
import type { DbProject } from "@/lib/types";

export { CaptureBackdrop, isDockDismissible } from "@/components/organisms/capture-backdrop";

interface CaptureComposerProps {
  cap: UseCaptureReturn;
  projects: DbProject[];
}

export const CaptureComposer = forwardRef<
  InputStageHandle,
  CaptureComposerProps
>(function CaptureComposer({ cap, projects }, ref): React.ReactElement | null {
  if (
    !cap.composerOpen &&
    !cap.isRecording &&
    cap.pendingThought === null &&
    !cap.dockAlwaysVisible
  ) {
    return null;
  }

  return (
    <DockShell register="slab" contentKey="capture-flow">
      <CaptureFlow ref={ref} cap={cap} projects={projects} />
    </DockShell>
  );
});
