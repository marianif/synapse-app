import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/atoms/themed-text";
import { PlanCard } from "@/components/molecules/plan-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { useEntitlement } from "@/contexts/entitlement-context";
import { isUpgradeReason, type UpgradeReason } from "@/hooks/use-upgrade";
import { FREE_LIMITS } from "@/lib/entitlements";
import { PRICING } from "@/lib/pricing";

import type { PlanOverride } from "@/lib/settings";

type PlanChoice = Extract<PlanOverride, "lifetime" | "monthly">;

const BENEFITS = [
  "Unlimited projects, habits, and notes",
  "Export and restore everything you've captured",
  "The whole board, no ceilings",
] as const;

type NarrativeSegment = { text: string; hand?: boolean };

/**
 * The "why the price is what it is" note. Base runs read in the neutral body
 * voice; the meaningful runs take the Caveat hand and the primary ink, so the
 * emphasis is scrawled rather than shouted. Three hand runs max — more turns
 * jumpy.
 */
const NARRATIVE: NarrativeSegment[] = [
  { text: "Synapse keeps everything " },
  { text: "on your device", hand: true },
  { text: ", with " },
  { text: "no ads and no tracking", hand: true },
  {
    text: ". The price stays as low as it can while keeping the app running, so it can stay ",
  },
  { text: "fair for everyone", hand: true },
  { text: " and the board stays yours." },
];

/** The specific limit that sent the user here, stated plainly. */
function reasonMessage(reason: UpgradeReason): string {
  switch (reason) {
    case "projects":
      return `You've reached ${FREE_LIMITS.projects} projects on the free plan.`;
    case "habits":
      return `You've reached ${FREE_LIMITS.habits} habits on the free plan.`;
    case "entries":
      return `You've reached ${FREE_LIMITS.entries} open entries on the free plan.`;
    case "notes":
      return `You've reached ${FREE_LIMITS.notes} notes on the free plan.`;
    case "export":
      return "Export is part of Synapse Pro.";
    case "import":
      return "Import and restore are part of Synapse Pro.";
  }
}

/**
 * The upgrade surface. Reached directly from a blocked action (the gate passes
 * which limit tripped), and later from Settings.
 *
 * Framing is disclosure-first: the current state and the free limits are named
 * plainly, the one-time nature of lifetime is stated, and the only urgency is
 * the trial clock already in the status line. No countdown timers, no shaming
 * dismiss, no fabricated scarcity.
 */
export default function PaywallScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { planKind, isPro, isTrialActive, trialDaysLeft, setPlanOverride } =
    useEntitlement();
  const { reason } = useLocalSearchParams<{ reason?: string }>();

  const [choice, setChoice] = useState<PlanChoice>("lifetime");

  const isLifetime = isPro && planKind === "lifetime";
  const isMonthly = isPro && planKind === "monthly";
  const upgradeReason = isUpgradeReason(reason) ? reason : null;
  // The intro price rides on the trial, and doubles as the subscriber crossgrade.
  const introEligible = isTrialActive || isMonthly;

  const statusLine = isLifetime
    ? "PRO · LIFETIME"
    : isMonthly
      ? "CURRENT PLAN · MONTHLY"
      : isTrialActive
        ? `TRIAL · ${trialDaysLeft} ${trialDaysLeft === 1 ? "DAY" : "DAYS"} LEFT`
        : upgradeReason
          ? reasonMessage(upgradeReason)
          : `FREE PLAN · ${FREE_LIMITS.projects} PROJECTS · ${FREE_LIMITS.habits} HABITS · ${FREE_LIMITS.notes} NOTES`;

  const hero = isLifetime
    ? "You're Pro."
    : isMonthly
      ? "Make it yours for good."
      : "Keep the whole board.";

  const lifetimePrice = introEligible
    ? PRICING.lifetimeIntro.display
    : PRICING.lifetime.display;
  const lifetimeStrike = introEligible ? PRICING.lifetime.display : undefined;
  const lifetimeDetail = isMonthly
    ? "Switch from monthly. Keep Pro for good."
    : introEligible
      ? "Intro price while your trial is on."
      : "One payment. Yours for good.";

  const selectPlan = (next: PlanChoice): void => {
    if (choice !== next) void Haptics.selectionAsync();
    setChoice(next);
  };

  const handlePurchase = (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!__DEV__) {
      // RevenueCat `purchasePackage` lands here.
      return;
    }
    // Dev: simulate the purchase by forcing the plan, then dismiss.
    setPlanOverride(choice);
    router.back();
  };

  const ctaLabel =
    choice === "lifetime"
      ? `Unlock lifetime · ${lifetimePrice}`
      : `Start monthly · ${PRICING.monthly.display}`;

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: tokens.space.xl }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={styles.headerBtn}
        >
          <IconSymbol name="X" size={22} color={colors.ink} />
        </Pressable>

        <View style={styles.headerTitle}>
          <ThemedText type="micro" muted>
            SYNAPSE PRO
          </ThemedText>
        </View>

        <Pressable
          onPress={() => {
            // RevenueCat `restorePurchases` lands here.
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Restore purchases"
          style={[styles.headerBtn, styles.headerBtnEnd]}
        >
          <ThemedText type="caption" muted>
            Restore
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + tokens.space.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <ThemedText type="display" style={{ color: colors.ink }}>
            {hero}
          </ThemedText>
          <ThemedText type="body" muted style={styles.narrative}>
            {NARRATIVE.map((segment, index) =>
              segment.hand ? (
                <Text
                  key={index}
                  style={[styles.handRun, { color: colors.ink }]}
                >
                  {segment.text}
                </Text>
              ) : (
                segment.text
              ),
            )}
          </ThemedText>
          <ThemedText type="mono" muted style={styles.status}>
            {statusLine}
          </ThemedText>
        </View>

        {isLifetime ? (
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: pressed
                  ? colors.accent.clayPressed
                  : colors.accent.clay,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <ThemedText type="bodyBold" style={{ color: colors.accent.onClay }}>
              Done
            </ThemedText>
          </Pressable>
        ) : (
          <>
            <View style={styles.plans}>
              <PlanCard
                title="Lifetime"
                price={lifetimePrice}
                strikePrice={lifetimeStrike}
                detail={lifetimeDetail}
                chip="ONE-TIME"
                selected={choice === "lifetime"}
                onPress={() => selectPlan("lifetime")}
              />
              <PlanCard
                title="Monthly"
                price={PRICING.monthly.display}
                period={PRICING.monthly.period}
                detail={isMonthly ? "Your current plan." : "Cancel anytime."}
                chip={isMonthly ? "CURRENT PLAN" : undefined}
                selected={choice === "monthly"}
                disabled={isMonthly}
                onPress={() => selectPlan("monthly")}
              />
            </View>

            {!isPro ? (
              <View style={styles.benefits}>
                {BENEFITS.map((benefit) => (
                  <View key={benefit} style={styles.benefitRow}>
                    <IconSymbol
                      name="Check"
                      size={16}
                      color={colors.inkMuted}
                    />
                    <ThemedText
                      type="body"
                      style={[styles.benefitText, { color: colors.ink }]}
                    >
                      {benefit}
                    </ThemedText>
                  </View>
                ))}
              </View>
            ) : null}

            <Pressable
              onPress={handlePurchase}
              style={({ pressed }) => [
                styles.cta,
                {
                  backgroundColor: pressed
                    ? colors.accent.clayPressed
                    : colors.accent.clay,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={ctaLabel}
            >
              <ThemedText
                type="bodyBold"
                style={{ color: colors.accent.onClay }}
              >
                {ctaLabel}
              </ThemedText>
            </Pressable>

            <ThemedText type="caption" muted style={styles.finePrint}>
              Monthly renews at {PRICING.monthly.display} per month until
              cancelled. Lifetime is a one-time payment.
            </ThemedText>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.space.lg,
    paddingBottom: tokens.space.md,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerBtnEnd: {
    alignItems: "flex-end",
  },
  headerTitle: {
    flex: 1,
    alignItems: "center",
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.lg,
    gap: tokens.space.xl,
  },
  hero: {
    gap: tokens.space.sm,
  },
  narrative: {
    marginTop: tokens.space.xs,
    // Even leading so the larger Caveat runs don't jitter the paragraph.
    lineHeight: 26,
  },
  handRun: {
    fontFamily: tokens.type.fontHand.regular,
    fontSize: 20,
    lineHeight: 26,
  },
  status: {
    marginTop: tokens.space.sm,
  },
  plans: {
    gap: tokens.space.md,
  },
  benefits: {
    gap: tokens.space.md,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  benefitText: {
    flex: 1,
  },
  cta: {
    minHeight: 52,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space.xl,
  },
  finePrint: {
    lineHeight: 16,
  },
});
