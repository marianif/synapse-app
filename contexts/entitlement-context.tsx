import { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";

import {
  deriveEntitlement,
  trialEndsAt,
  TRIAL_DAYS,
  type Entitlement,
  type ProKind,
} from "@/lib/entitlements";
import {
  clearTrialStartedAt,
  getPlanOverride,
  getTrialStartedAt,
  setPlanOverride as persistPlanOverride,
  setTrialStartedAt,
  type PlanOverride,
} from "@/lib/settings";

/**
 * App-wide entitlement state: the trial clock, the paid plan (later from
 * RevenueCat), and the caps those resolve to. Mirrors the Theme/Onboarding
 * provider pattern — a small persisted scalar with a ready gate — rather than
 * a Redux slice, since none of this comes out of SQLite.
 */
type EntitlementContextValue = Entitlement & {
  /** True once the persisted trial clock has been read. */
  isReady: boolean;
  /** Dev-only override; always "auto" outside __DEV__. */
  planOverride: PlanOverride;
  /** Dev-only. Force a plan state without RevenueCat. */
  setPlanOverride: (value: PlanOverride) => void;
  /** Dev-only. Restart the trial from now. */
  restartTrial: () => Promise<void>;
};

const EntitlementContext = createContext<EntitlementContextValue | null>(null);

/** Force a plan state for testing; only reachable from __DEV__. */
function applyOverride(
  base: Entitlement,
  override: PlanOverride,
): Entitlement {
  switch (override) {
    case "auto":
      return base;
    case "trial":
      return {
        planKind: "trial",
        isPro: false,
        isTrialActive: true,
        trialDaysLeft: TRIAL_DAYS,
        hasFullAccess: true,
      };
    case "free":
      return {
        planKind: "free",
        isPro: false,
        isTrialActive: false,
        trialDaysLeft: 0,
        hasFullAccess: false,
      };
    case "monthly":
      return {
        planKind: "monthly",
        isPro: true,
        isTrialActive: false,
        trialDaysLeft: 0,
        hasFullAccess: true,
      };
    case "lifetime":
      return {
        planKind: "lifetime",
        isPro: true,
        isTrialActive: false,
        trialDaysLeft: 0,
        hasFullAccess: true,
      };
  }
}

export function EntitlementProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [trialStartedAt, setTrialStart] = useState<number | null>(null);
  const [planOverride, setOverrideState] = useState<PlanOverride>("auto");
  const [isReady, setIsReady] = useState(false);
  // The clock the entitlement derives from. Held in state (not read in render)
  // so a trial can lapse while the app stays open — see the two effects below.
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedStart, storedOverride] = await Promise.all([
        getTrialStartedAt(),
        getPlanOverride(),
      ]);

      // First launch: stamp the trial clock so the 7 days start now.
      let start = storedStart;
      if (start === null) {
        start = Date.now();
        await setTrialStartedAt(start);
      }

      if (cancelled) return;
      setTrialStart(start);
      setOverrideState(storedOverride);
      setIsReady(true);
    })().catch((error) => {
      console.error("[EntitlementProvider] load failed:", error);
      if (!cancelled) {
        // Release the gate with a clock so the app is usable; a storage
        // failure should never brick the first run.
        setTrialStart(Date.now());
        setIsReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-derive when the app returns to the foreground: the trial may have
  // lapsed while it was backgrounded.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(Date.now());
    });
    return () => subscription.remove();
  }, []);

  // Fire once, just past the trial edge, so the downgrade to the capped free
  // tier lands without a reload. Re-armed whenever the clock is restarted
  // (dev reset or a future purchase). setTimeout tops out near 24.8 days; the
  // 7-day trial is well inside that.
  useEffect(() => {
    if (trialStartedAt === null) return;
    const untilEnd = Math.max(0, trialEndsAt(trialStartedAt) - Date.now());
    const timer = setTimeout(() => setNow(Date.now()), untilEnd + 1000);
    return () => clearTimeout(timer);
  }, [trialStartedAt]);

  // RevenueCat wires the real paid plan in here. Until then the only live
  // states are trial and free; the override drives the rest in dev.
  const proKind: ProKind | null = null;

  const real = deriveEntitlement({
    trialStartedAt,
    now,
    proKind,
  });

  const effectiveOverride: PlanOverride = __DEV__ ? planOverride : "auto";
  const entitlement = applyOverride(real, effectiveOverride);

  const setPlanOverride = (value: PlanOverride): void => {
    setOverrideState(value); // optimistic
    persistPlanOverride(value).catch((error) =>
      console.error("[EntitlementProvider] persist override failed:", error),
    );
  };

  const restartTrial = async (): Promise<void> => {
    const now = Date.now();
    setTrialStart(now);
    await clearTrialStartedAt();
    await setTrialStartedAt(now);
  };

  // React Compiler memoizes this; no manual useMemo.
  const value: EntitlementContextValue = {
    ...entitlement,
    isReady,
    planOverride,
    setPlanOverride,
    restartTrial,
  };

  return (
    <EntitlementContext.Provider value={value}>
      {children}
    </EntitlementContext.Provider>
  );
}

export function useEntitlement(): EntitlementContextValue {
  const context = useContext(EntitlementContext);
  if (!context) {
    throw new Error("useEntitlement must be used within EntitlementProvider");
  }
  return context;
}
