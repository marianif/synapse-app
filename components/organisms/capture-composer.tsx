import { CaptureFlow } from "@/components/organisms/capture-flow";
import { DockShell } from "@/components/organisms/dock-shell";
import type { UseCaptureReturn } from "@/hooks/use-capture";
import type { DbProject } from "@/lib/types";

export { CaptureBackdrop, isDockDismissible } from "@/components/organisms/capture-backdrop";

interface CaptureComposerProps {
  cap: UseCaptureReturn;
  projects: DbProject[];
}

export function CaptureComposer({
  cap,
  projects,
}: CaptureComposerProps): React.ReactElement | null {
  if (!cap.composerOpen && !cap.isRecording && cap.pendingThought === null) {
    return null;
  }

  return (
    <DockShell register="slab" contentKey="capture-flow">
      <CaptureFlow cap={cap} projects={projects} />
    </DockShell>
  );
}
