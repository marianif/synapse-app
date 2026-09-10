import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  BackHandler,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandMark } from "@/components/atoms/brand-mark";
import { ThemedText } from "@/components/atoms/themed-text";
import {
  ChapterScene,
  ColdOpenWash,
  useChapterProgress,
  type OnboardingStage,
} from "@/components/organisms/onboarding-scenes";
import {
  ChapterStage,
  useEnterStyle,
} from "@/components/organisms/onboarding-stages";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme, type ThemeColors } from "@/constants/theme";
import { useOnboarding } from "@/contexts/onboarding-context";

import type { AnimatedStyle, SharedValue } from "react-native-reanimated";

/**
 * The first-run story: six cinematic chapters, told in the maker's voice, with
 * the real Field Lab UI staged over a Skia scene layer. Copy and controls stay
 * React Native (accessible, scalable); the canvas is decorative and hidden.
 * Every entrance is timing on the brand bezier; continuous motion (voice
 * waveform, the mark's breath) holds still under reduced motion.
 */

type Panel = {
  id: string;
  kicker: string;
  title: string;
  stage: OnboardingStage;
  stageHeight: number;
  /** Entrance length in ms; the cold open runs longer than a chapter. */
  duration?: number;
  /** Bare chapters drop the tile and run the scene full-width on the paper. */
  bare?: boolean;
  /** Hero chapters are full-bleed type moments (the code wash + big headline). */
  hero?: boolean;
};

const COLD_OPEN_ID = "cold-open";

// Chapter 00 hides the chrome while the mark ignites, then reveals it once the
// wordmark has landed.
const CHROME_REVEAL_DELAY = 2050;
const EASE = Easing.bezier(0.22, 1, 0.36, 1);

const PANELS: readonly Panel[] = [
  {
    id: COLD_OPEN_ID,
    kicker: "",
    title: "Made for how you think.",
    stage: "open",
    stageHeight: 300,
    duration: 2200,
    hero: true,
  },
  {
    id: "tools",
    kicker: "CHAPTER 01 · THE TOOLS",
    title: "Everything I tried worked for half of it.",
    stage: "tools",
    stageHeight: 250,
  },
  {
    id: "turn",
    kicker: "CHAPTER 02 · THE TURN",
    title: "So I started from the thought, not the tool.",
    stage: "turn",
    stageHeight: 300,
    duration: 3400,
    bare: true,
  },
  {
    id: "capture",
    kicker: "CHAPTER 03 · ONE KEY",
    title: "One key catches everything.",
    stage: "capture",
    stageHeight: 320,
    bare: true,
    duration: 2800,
  },
  {
    id: "entities",
    kicker: "CHAPTER 04 · WHAT IT HOLDS",
    title: "Four kinds of things. One place.",
    stage: "entities",
    stageHeight: 360,
    bare: true,
  },
  {
    id: "promise",
    kicker: "CHAPTER 05 · THE PROMISE",
    title: "Everything has a place.",
    stage: "promise",
    stageHeight: 240,
    hero: true,
    duration: 2400,
  },
];

export function OnboardingCarousel(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const { completeOnboarding } = useOnboarding();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const reducedMotion = useReducedMotion();

  // Chrome (footer + Skip) is hidden through the cold open, then revealed.
  const chrome = useSharedValue(0);
  useEffect(() => {
    if (page !== 0) {
      chrome.value = 1;
      return;
    }
    chrome.value = reducedMotion
      ? 1
      : withDelay(
          CHROME_REVEAL_DELAY,
          withTiming(1, { duration: 500, easing: EASE }),
        );
  }, [page, reducedMotion, chrome]);
  const chromeStyle = useAnimatedStyle(() => ({ opacity: chrome.value }));

  const lastPage = PANELS.length - 1;

  const goToPage = (nextPage: number): void => {
    const boundedPage = Math.max(0, Math.min(nextPage, lastPage));
    setPage(boundedPage);
    scrollRef.current?.scrollTo({
      x: boundedPage * width,
      animated: !reducedMotion,
    });
  };

  const finish = async (): Promise<void> => {
    if (isFinishing) return;
    setIsFinishing(true);
    await completeOnboarding();
    router.replace("/(tabs)/(home)");
  };

  const handleContinue = (): void => {
    if (page < lastPage) {
      goToPage(page + 1);
      return;
    }
    void finish();
  };

  const handleSkip = (): void => {
    void finish();
  };

  const handleScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ): void => {
    const nextPage = Math.round(event.nativeEvent.contentOffset.x / width);
    setPage(Math.max(0, Math.min(nextPage, lastPage)));
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (page === 0) return true;
        const previousPage = page - 1;
        setPage(previousPage);
        scrollRef.current?.scrollTo({
          x: previousPage * width,
          animated: !reducedMotion,
        });
        return true;
      },
    );
    return () => subscription.remove();
  }, [page, reducedMotion, width]);

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.paper,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.brand, page === 0 && styles.brandHidden]}>
          <BrandMark size={22} />
          <ThemedText type="headline" style={styles.wordmark}>
            synapse
          </ThemedText>
        </View>
        {page < lastPage ? (
          <Animated.View style={chromeStyle}>
            <Pressable
              onPress={handleSkip}
              disabled={isFinishing}
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding"
              style={styles.skipButton}
            >
              <ThemedText type="body" muted>
                Skip
              </ThemedText>
            </Pressable>
          </Animated.View>
        ) : (
          <View style={styles.skipButton} />
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        style={styles.carousel}
        contentContainerStyle={styles.carouselContent}
        accessibilityLabel="Synapse introduction"
      >
        {PANELS.map((panel, index) => (
          <ScrollView
            key={panel.id}
            style={[styles.panel, { width }]}
            contentContainerStyle={
              panel.hero ? styles.heroContent : styles.panelContent
            }
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <Chapter
              panel={panel}
              active={page === index}
              screenWidth={width}
              screenHeight={height}
              colors={colors}
              onBegin={handleContinue}
            />
          </ScrollView>
        ))}
      </ScrollView>

      {page !== 0 ? (
        <Animated.View style={[styles.footer, chromeStyle]}>
          <View
            style={styles.pagination}
            accessible
            accessibilityLabel={`Introduction page ${page + 1} of ${PANELS.length}`}
          >
            {PANELS.map((panel, index) => (
              <View
                key={panel.id}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      index === page
                        ? colors.accent.clay
                        : colors.surfaceSubtle,
                  },
                  index === page && styles.activeDot,
                ]}
              />
            ))}
          </View>
          <Pressable
            onPress={handleContinue}
            disabled={isFinishing}
            accessibilityRole="button"
            accessibilityLabel={
              page === lastPage ? "Capture something" : "Continue"
            }
            style={({ pressed }) => [
              styles.continueButton,
              {
                backgroundColor: pressed
                  ? colors.accent.clayPressed
                  : colors.accent.clay,
              },
            ]}
          >
            <ThemedText
              type="bodyBold"
              style={[styles.continueLabel, { color: colors.accent.onClay }]}
            >
              {page === lastPage ? "Capture something." : "Continue"}
            </ThemedText>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

function Chapter({
  panel,
  active,
  screenWidth,
  screenHeight,
  colors,
  onBegin,
}: {
  panel: Panel;
  active: boolean;
  screenWidth: number;
  screenHeight: number;
  colors: ThemeColors;
  onBegin: () => void;
}): React.ReactElement {
  const progress = useChapterProgress(active, panel.duration);
  const bare = panel.bare === true;
  const stageWidth = bare ? screenWidth : screenWidth - tokens.space.xxl * 2;

  if (panel.id === COLD_OPEN_ID) {
    return (
      <TypeHero
        width={screenWidth}
        height={screenHeight}
        progress={progress}
        colors={colors}
        headline={COLD_HEADLINE}
        sub={
          <ThemedText
            type="hand"
            style={[styles.heroSub, { color: colors.inkMuted }]}
          >
            Not the other way around.
          </ThemedText>
        }
        cta={{ label: "Get started", onPress: onBegin }}
        hint="SAVE IT. SEE IT. KEEP IT."
      />
    );
  }

  if (panel.id === "promise") {
    return (
      <TypeHero
        width={screenWidth}
        height={screenHeight}
        progress={progress}
        colors={colors}
        headline={PROMISE_HEADLINE}
        sub={<PromiseLines colors={colors} />}
      />
    );
  }

  return (
    <>
      <View
        style={[
          styles.stage,
          {
            height: panel.stageHeight,
            width: stageWidth,
            alignSelf: bare ? "stretch" : "center",
          },
        ]}
      >
        <View
          style={[
            styles.stageScene,
            bare
              ? null
              : {
                  backgroundColor: colors.surfaceSubtle,
                  borderRadius: tokens.radius.lg,
                  overflow: "hidden",
                },
          ]}
        >
          <ChapterScene
            kind={panel.stage}
            width={stageWidth}
            height={panel.stageHeight}
            progress={progress}
            colors={colors}
            active={active}
          />
        </View>
        <View
          style={[styles.stageOverlay, bare && styles.stageOverlayBare]}
          pointerEvents="none"
        >
          <ChapterStage
            kind={panel.stage}
            width={stageWidth - (bare ? 0 : tokens.space.lg * 2)}
            height={panel.stageHeight}
            progress={progress}
            colors={colors}
            active={active}
          />
        </View>
      </View>
      <ChapterCopy panel={panel} progress={progress} colors={colors} />
    </>
  );
}

const COLD_HEADLINE = ["Made for", "how you think."] as const;
const PROMISE_HEADLINE = ["Everything has", "a place."] as const;

/** The full-bleed type hero shared by the cold open and the promise. */
function TypeHero({
  width,
  height,
  progress,
  colors,
  headline,
  sub,
  cta,
  hint,
}: {
  width: number;
  height: number;
  progress: SharedValue<number>;
  colors: ThemeColors;
  headline: readonly string[];
  sub: React.ReactNode;
  cta?: { label: string; onPress: () => void };
  hint?: string;
}): React.ReactElement {
  const markStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.14],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  const subStart = 0.5 + (headline.length - 1) * 0.12;
  const subStyle = useEnterStyle(progress, subStart, subStart + 0.26, 8);
  const ctaStyle = useEnterStyle(progress, 0.74, 0.92, 12);

  return (
    <View style={styles.hero}>
      <View style={styles.heroWash} pointerEvents="none">
        <ColdOpenWash
          width={width}
          height={height}
          progress={progress}
          colors={colors}
          active
        />
      </View>

      <View style={styles.heroCenter}>
        <Animated.View style={markStyle}>
          <BrandMark size={50} />
        </Animated.View>
        <View style={styles.heroHeadline}>
          {headline.map((lineText, index) => (
            <HeroLine
              key={lineText}
              text={lineText}
              progress={progress}
              start={0.32 + index * 0.12}
              end={0.32 + index * 0.12 + 0.25}
            />
          ))}
        </View>
        <Animated.View style={subStyle}>{sub}</Animated.View>
      </View>

      {cta ? (
        <Animated.View style={[styles.heroBottom, ctaStyle]}>
          <Pressable
            onPress={cta.onPress}
            accessibilityRole="button"
            accessibilityLabel={cta.label}
            style={({ pressed }) => [
              styles.heroCta,
              {
                backgroundColor: pressed
                  ? colors.accent.clayPressed
                  : colors.accent.clay,
              },
            ]}
          >
            <ThemedText type="bodyBold" style={{ color: colors.accent.onClay }}>
              {cta.label}
            </ThemedText>
            <IconSymbol
              name="ArrowRight"
              size={18}
              color={colors.accent.onClay}
            />
          </Pressable>
          {hint ? (
            <ThemedText type="micro" muted style={styles.heroHint}>
              {hint}
            </ThemedText>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

/** One headline line rising through its clip mask. */
function HeroLine({
  text,
  progress,
  start,
  end,
}: {
  text: string;
  progress: SharedValue<number>;
  start: number;
  end: number;
}): React.ReactElement {
  const mask = useMaskLine(progress, start, end);
  return (
    <View style={styles.heroLineClip}>
      <Animated.View style={mask}>
        <ThemedText type="display" style={styles.heroLine}>
          {text}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

/** The three promise lines, as the hero's sub. */
function PromiseLines({ colors }: { colors: ThemeColors }): React.ReactElement {
  return (
    <View style={styles.promiseCopy}>
      <ThemedText
        type="body"
        style={[styles.promiseLine, { color: colors.typeKicker.todo }]}
      >
        Capture quickly.
      </ThemedText>
      <ThemedText
        type="hand"
        style={[styles.promiseLineHand, { color: colors.typeKicker.ideas }]}
      >
        Follow things as they grow.
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.promiseLine, { color: colors.ink }]}
      >
        Keep what matters in sight.
      </ThemedText>
    </View>
  );
}

/** A line rising through its clip mask. */
function useMaskLine(
  progress: SharedValue<number>,
  start: number,
  end: number,
): AnimatedStyle<ViewStyle> {
  return useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [start, end],
          [52, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));
}

function ChapterCopy({
  panel,
  progress,
  colors,
}: {
  panel: Panel;
  progress: SharedValue<number>;
  colors: ThemeColors;
}): React.ReactElement {
  const kickerStyle = useEnterStyle(progress, 0.12, 0.34, 8);
  const titleStyle = useEnterStyle(progress, 0.18, 0.44, 12);
  const bodyStyle = useEnterStyle(progress, 0.26, 0.54, 12);

  return (
    <View style={styles.copy}>
      <Animated.View style={kickerStyle}>
        <ThemedText type="label" muted>
          {panel.kicker}
        </ThemedText>
      </Animated.View>
      <Animated.View style={titleStyle}>
        <ThemedText type="display" style={styles.title}>
          {panel.title}
        </ThemedText>
      </Animated.View>
      <Animated.View style={bodyStyle}>
        <ChapterBody id={panel.id} colors={colors} />
      </Animated.View>
    </View>
  );
}

function ChapterBody({
  id,
  colors,
}: {
  id: string;
  colors: ThemeColors;
}): React.ReactElement {
  const hand = (
    key: string,
    phrase: string,
    color: string,
  ): React.ReactElement => (
    <Text key={key} style={[styles.bodyHandInline, { color }]}>
      {phrase}
    </Text>
  );

  if (id === "tools") {
    return (
      <ThemedText type="body" style={[styles.body, { color: colors.inkMuted }]}>
        Notes were fast, then turned into{" "}
        {hand("piles", "piles I never opened again.", colors.typeKicker.todo)}{" "}
        Project apps were powerful, then wanted me to become{" "}
        {hand(
          "maintain",
          "someone who maintains them.",
          colors.typeKicker.ideas,
        )}{" "}
        And they all nagged: streaks, overdue red, a “today” view that quietly
        forgot yesterday. Each one asked me to shrink to fit it.
      </ThemedText>
    );
  }

  if (id === "turn") {
    return (
      <ThemedText type="body" style={[styles.body, { color: colors.inkMuted }]}>
        A thought already has a shape when it arrives:{" "}
        {hand("flicker", "a flicker,", colors.typeKicker.ideas)}{" "}
        {hand("promise", "a promise,", colors.typeKicker.todo)}{" "}
        {hand("date", "a date,", colors.typeKicker.bills)}{" "}
        {hand("project", "a project.", colors.ink)} What if one place took any
        of them at the speed they show up, and asked nothing before it was safe?
      </ThemedText>
    );
  }

  if (id === "capture") {
    return (
      <ThemedText type="body" style={[styles.body, { color: colors.inkMuted }]}>
        Tap the pen to type it. Hold the pen and just say it. I never have to
        decide what a thing is before it is safe. The app asks after.{" "}
        {hand("keep", "Keep it.", colors.typeKicker.ideas)}{" "}
        {hand("do", "Do it.", colors.typeKicker.todo)}{" "}
        {hand("date", "Put a date on it.", colors.typeKicker.bills)}{" "}
        {hand("note", "Or just write it down.", colors.ink)}
      </ThemedText>
    );
  }

  if (id === "entities") {
    return (
      <ThemedText type="body" style={[styles.body, { color: colors.inkMuted }]}>
        {hand("idea", "An idea", colors.typeKicker.ideas)} is a spark worth
        keeping. {hand("todo", "A todo", colors.typeKicker.todo)} is something
        on the line. {hand("deadline", "A deadline", colors.typeKicker.bills)}{" "}
        is a horizon the clock is chasing. {hand("note", "A note", colors.ink)}{" "}
        is just a thought you want to hold. Everything lives on the board, or
        inside the project it belongs to.
      </ThemedText>
    );
  }

  return <></>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.space.xxl,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  wordmark: {
    fontFamily: tokens.type.fontInter.bold,
    fontSize: 18,
    lineHeight: 22,
  },
  // Chapter 00 owns the wordmark reveal, so the header mark stays hidden there.
  brandHidden: {
    opacity: 0,
  },
  skipButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  carousel: {
    flex: 1,
  },
  carouselContent: {
    alignItems: "stretch",
  },
  panel: {
    flex: 1,
  },
  panelContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: tokens.space.lg,
  },
  // Chapter 00 is full-bleed: no padding, so the code wash spans the screen.
  heroContent: {
    flexGrow: 1,
  },
  hero: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: tokens.space.xxxl,
    paddingBottom: tokens.space.xl,
  },
  heroWash: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  heroCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.lg,
    paddingHorizontal: tokens.space.xxl,
  },
  heroHeadline: {
    alignItems: "center",
  },
  heroLineClip: {
    overflow: "hidden",
  },
  heroLine: {
    fontSize: 46,
    lineHeight: 50,
    letterSpacing: -1.5,
    textAlign: "center",
  },
  heroSub: {
    maxWidth: 320,
    fontSize: 22,
    lineHeight: 24,
    textAlign: "center",
  },
  heroBottom: {
    gap: tokens.space.md,
    paddingBottom: tokens.space.sm,
    paddingHorizontal: tokens.space.xxl,
  },
  heroCta: {
    minHeight: 56,
    borderRadius: tokens.radius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.sm,
  },
  heroHint: {
    textAlign: "center",
  },
  stage: {
    position: "relative",
  },
  stageScene: {
    ...StyleSheet.absoluteFillObject,
  },
  stageOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: tokens.space.lg,
    justifyContent: "center",
  },
  // Bare chapters run edge to edge; their stages own any inner padding.
  stageOverlayBare: {
    paddingHorizontal: 0,
  },
  copy: {
    gap: tokens.space.md,
    paddingTop: tokens.space.xxl,
    paddingHorizontal: tokens.space.xxl,
  },
  title: {
    maxWidth: 440,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
    fontFamily: tokens.type.fontInter.semiBold,
  },
  body: {
    maxWidth: 440,
    fontSize: 16,
    lineHeight: 25,
  },
  bodyStrong: {
    fontFamily: tokens.type.fontInter.semiBold,
  },
  bodyHandInline: {
    fontFamily: tokens.type.fontHand.regular,
    fontSize: 21,
    lineHeight: 25,
  },
  promiseCopy: {
    gap: tokens.space.xs,
    alignItems: "center",
  },
  promiseLine: {
    maxWidth: 440,
    fontSize: 16,
    lineHeight: 25,
    textAlign: "center",
  },
  promiseLineHand: {
    maxWidth: 440,
    fontSize: 21,
    lineHeight: 26,
    textAlign: "center",
  },
  footer: {
    gap: tokens.space.lg,
    paddingHorizontal: tokens.space.xxl,
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.sm,
  },
  pagination: {
    minHeight: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
  dot: {
    width: 8,
    height: 4,
    borderRadius: tokens.radius.pill,
  },
  activeDot: {
    width: 24,
  },
  continueButton: {
    minHeight: 52,
    borderRadius: tokens.radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  continueLabel: {
    fontFamily: tokens.type.fontInter.semiBold,
  },
});
