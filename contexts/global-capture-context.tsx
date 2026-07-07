import { createContext, useContext } from "react";

import type { UseCaptureReturn } from "@/hooks/use-capture";

/**
 * The neutral (unlocked) capture instance, owned by the tab layout so the
 * pen key works identically from every tab — no navigation, no route-param
 * relay. Screen-local `useCapture({ lockedProjectId })` instances (project
 * surfaces) are a separate, deliberate case and don't go through here.
 */
export const GlobalCaptureContext = createContext<UseCaptureReturn | null>(
  null,
);

export function useGlobalCapture(): UseCaptureReturn {
  const context = useContext(GlobalCaptureContext);
  if (!context) {
    throw new Error(
      "useGlobalCapture must be used within GlobalCaptureContext.Provider",
    );
  }
  return context;
}
