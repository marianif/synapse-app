import { forwardRef } from "react";

import { CaptureConsole } from "@/components/organisms/capture-console";
import { CaptureComposer as StagedCaptureComposer } from "@/components/organisms/capture-composer";
import type { InputStageHandle } from "@/components/organisms/input-stage-view";
import type { UseCaptureReturn } from "@/hooks/use-capture";
import type { DbProject } from "@/lib/types";

export { CaptureBackdrop, isDockDismissible } from "@/components/organisms/capture-backdrop";

export type CaptureComposerVariant = "flow" | "console";

// Keep the original staged composer one edit away while the console is being
// evaluated. Switch this back to "flow" to restore the existing presentation.
export const ACTIVE_CAPTURE_COMPOSER: CaptureComposerVariant = "console";

export const CaptureComposerVariantView = forwardRef<
  InputStageHandle,
  {
    cap: UseCaptureReturn;
    projects: DbProject[];
  }
>(function CaptureComposerVariantView(
  { cap, projects },
  ref,
): React.ReactElement | null {
  return ACTIVE_CAPTURE_COMPOSER === "console" ? (
    <CaptureConsole ref={ref} cap={cap} projects={projects} />
  ) : (
    <StagedCaptureComposer ref={ref} cap={cap} projects={projects} />
  );
});
