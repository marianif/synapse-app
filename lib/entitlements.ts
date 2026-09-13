/**
 * The revenue boundary, as pure data.
 *
 * Nothing here touches React, storage, or RevenueCat. This is the single
 * source of truth for what a plan unlocks, so the entitlement context, the
 * creation gates, and the paywall all read the same numbers and can't drift.
 *
 * The model: a 7-day app-level trial grants full access with no card; when it
 * lapses the free caps apply; a monthly subscription or a lifetime purchase
 * grants `pro` and removes every cap. The future AI/sync add-on is a separate
 * entitlement and deliberately absent from this file.
 */

export const TRIAL_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The caps a free (post-trial, non-Pro) user lives under. */
export const FREE_LIMITS = {
  projects: 8,
  habits: 3,
  entries: 20,
  notes: 5,
} as const;

export type CapKind = keyof typeof FREE_LIMITS;

/** The plan actually in effect right now. */
export type PlanKind = "trial" | "free" | "monthly" | "lifetime";

/** The paid products that grant `pro`, as RevenueCat will report them. */
export type ProKind = "monthly" | "lifetime";

export function isProKind(value: unknown): value is ProKind {
  return value === "monthly" || value === "lifetime";
}

export interface Entitlement {
  /** Which plan is in effect. */
  planKind: PlanKind;
  /** A paid plan is active; survives the trial. */
  isPro: boolean;
  /** The trial is still running. */
  isTrialActive: boolean;
  /** Whole days left in the trial; 0 when not on trial. */
  trialDaysLeft: number;
  /** Nothing is capped: Pro or an active trial. */
  hasFullAccess: boolean;
}

/** Epoch ms when a trial that began at `startedAt` ends. */
export function trialEndsAt(startedAt: number): number {
  return startedAt + TRIAL_DAYS * DAY_MS;
}

/** Whole days remaining in a trial that began at `startedAt`, clamped to [0, TRIAL_DAYS]. */
export function trialDaysLeft(startedAt: number, now: number): number {
  const elapsed = now - startedAt;
  const left = Math.ceil((TRIAL_DAYS * DAY_MS - elapsed) / DAY_MS);
  return Math.max(0, Math.min(TRIAL_DAYS, left));
}

/**
 * Resolve the current entitlement from the trial clock and the RevenueCat-
 * reported paid plan. Pure — pass `now` so expiry is testable.
 */
export function deriveEntitlement(args: {
  trialStartedAt: number | null;
  now: number;
  proKind: ProKind | null;
}): Entitlement {
  const { trialStartedAt, now, proKind } = args;
  const isPro = proKind !== null;
  const left = trialStartedAt === null ? 0 : trialDaysLeft(trialStartedAt, now);
  const isTrialActive = !isPro && left > 0;
  const planKind: PlanKind = isPro
    ? proKind
    : isTrialActive
      ? "trial"
      : "free";
  return {
    planKind,
    isPro,
    isTrialActive,
    trialDaysLeft: isTrialActive ? left : 0,
    hasFullAccess: isPro || isTrialActive,
  };
}

/** Whether `count` of `kind` has reached the free cap for this entitlement. */
export function isAtCap(
  kind: CapKind,
  count: number,
  entitlement: Entitlement,
): boolean {
  return !entitlement.hasFullAccess && count >= FREE_LIMITS[kind];
}
