import { createContext, useContext, useEffect, useState } from "react";

import {
  clearOnboardingComplete,
  getOnboardingComplete,
  setOnboardingComplete,
} from "@/lib/settings";

type OnboardingContextValue = {
  complete: boolean | null;
  isReady: boolean;
  completeOnboarding: () => Promise<void>;
  /**
   * Dev-only: clears the persisted first-run flag (and the in-memory gate) so
   * the onboarding story can be replayed from Settings.
   */
  resetOnboarding: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [complete, setComplete] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOnboardingComplete().then((value) => {
      if (!cancelled) setComplete(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const completeOnboarding = async (): Promise<void> => {
    // Update the gate before navigating so the route cannot bounce back to
    // onboarding while the persisted flag is being written.
    setComplete(true);
    await setOnboardingComplete();
  };

  const resetOnboarding = async (): Promise<void> => {
    // Flip the in-memory gate first so the router can't bounce a replay back to
    // the tabs while the persisted flag is being cleared.
    setComplete(false);
    await clearOnboardingComplete();
  };

  return (
    <OnboardingContext.Provider
      value={{
        complete,
        isReady: complete !== null,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
