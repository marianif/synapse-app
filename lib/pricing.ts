/**
 * The revenue surface's product config: one place the paywall, the limit
 * prompts, and (later) the App Store / RevenueCat setup read from, so prices
 * and identifiers can't drift.
 *
 * The $9.99 lifetime is a separate non-consumable (App Store can't attach an
 * intro offer to one) surfaced only while the trial is active, or to an active
 * monthly subscriber as the crossgrade. Both share the `pro` entitlement.
 */

export const PRICING = {
  monthly: { display: "$1.99", period: "/month", amount: 1.99 },
  lifetime: { display: "$19.99", amount: 19.99 },
  lifetimeIntro: { display: "$9.99", amount: 9.99 },
} as const;

/** RevenueCat / App Store product identifiers. Wired up with RevenueCat. */
export const PRODUCT_IDS = {
  monthly: "synapse_pro_monthly",
  lifetime: "synapse_pro_lifetime",
  lifetimeIntro: "synapse_pro_lifetime_intro",
} as const;
