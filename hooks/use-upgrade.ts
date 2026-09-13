import { useRouter } from "expo-router";

import type { CapKind } from "@/lib/entitlements";

/** Which limit tripped — a numeric cap, or a Pro-only data switch. */
export type UpgradeReason = CapKind | "export" | "import";

export function isUpgradeReason(value: unknown): value is UpgradeReason {
  return (
    value === "projects" ||
    value === "habits" ||
    value === "entries" ||
    value === "notes" ||
    value === "export" ||
    value === "import"
  );
}

/**
 * Opens the paywall directly, passing which limit tripped so the surface can
 * name it. Free-plan gates call this from the blocked action: one tap to the
 * decision, no intermediate sheet.
 */
export function useUpgrade(): { showUpgrade: (reason: UpgradeReason) => void } {
  const router = useRouter();
  return {
    showUpgrade: (reason) =>
      router.push({ pathname: "/paywall", params: { reason } }),
  };
}
