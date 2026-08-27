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
} from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandMark } from "@/components/atoms/brand-mark";
import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme, type ThemeColors } from "@/constants/theme";
import { useOnboarding } from "@/contexts/onboarding-context";

type SceneStage = 0 | 1 | 2 | 3 | 4 | 5;
type EntryTone = "deadline" | "todo" | "idea";

type Panel = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  stage: SceneStage;
  emphasis?: boolean;
};

const PANELS: readonly Panel[] = [
  {
    id: "origin",
    kicker: "WHY I STARTED",
    title: "I needed one place for everything from a passing thought to a growing project.",
    body: "Ideas. Deadlines. Growing projects. Random thoughts. They all needed somewhere to live.",
    stage: 0,
  },
  {
    id: "shapes",
    kicker: "THE RANGE",
    title: "My life is made of things with different shapes.",
    body: "A passing thought. A deadline, like paying taxes. An idea for a book I might write one day. A project that could take months to complete.",
    stage: 1,
  },
  {
    id: "friction",
    kicker: "THE GAP",
    title: "I could never find one place that handled all of them well.",
    body: "Notes were quick, but became disconnected piles. Project tools were powerful, but too rigid for a thought that had just appeared.",
    stage: 2,
  },
  {
    id: "insight",
    kicker: "WHAT I NEEDED",
    title: "I did not need more tools.",
    body: "I needed one place that could move at the speed of thought while still giving shape to everything that mattered.",
    stage: 3,
    emphasis: true,
  },
  {
    id: "continuity",
    kicker: "THE THREAD",
    title: "Some things need a date. Some need time to grow.",
    body: "They can still live in the same place, from the first thought to the finished project.",
    stage: 4,
  },
  {
    id: "promise",
    kicker: "THE PROMISE",
    title: "Everything has a place.",
    body: "Capture quickly.\nFollow things as they grow.\nKeep what matters in sight.",
    stage: 5,
    emphasis: true,
  },
];

export function OnboardingCarousel(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const { completeOnboarding } = useOnboarding();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const reducedMotion = useReducedMotion();

  const goToPage = (nextPage: number): void => {
    const boundedPage = Math.max(0, Math.min(nextPage, PANELS.length - 1));
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
    if (page < PANELS.length - 1) {
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
    setPage(Math.max(0, Math.min(nextPage, PANELS.length - 1)));
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
        <View style={styles.brand}>
          <BrandMark size={22} />
          <ThemedText type="headline" style={styles.wordmark}>
            synapse
          </ThemedText>
        </View>
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
        {PANELS.map((panel) => (
          <ScrollView
            key={panel.id}
            style={[styles.panel, { width }]}
            contentContainerStyle={styles.panelContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <FieldScene stage={panel.stage} colors={colors} />
            <View style={styles.copy}>
              <ThemedText type="mono" muted>
                {panel.kicker}
              </ThemedText>
              <ThemedText
                type="display"
                style={[styles.title, panel.emphasis && styles.emphasisTitle]}
              >
                {panel.title}
              </ThemedText>
              <PanelBody panel={panel} colors={colors} />
            </View>
          </ScrollView>
        ))}
      </ScrollView>

      <View style={styles.footer}>
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
                    index === page ? colors.accent.clay : colors.surfaceSubtle,
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
            page === PANELS.length - 1 ? "Enter Synapse" : "Continue"
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
            {page === PANELS.length - 1 ? "Enter Synapse" : "Continue"}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function PanelBody({
  panel,
  colors,
}: {
  panel: Panel;
  colors: ThemeColors;
}): React.ReactElement {
  if (panel.id === "origin") {
    return (
      <ThemedText type="body" style={styles.originBody}>
        <Text style={[styles.bodyHandInline, { color: colors.typeKicker.ideas }]}>Ideas.</Text>{" "}
        <Text style={[styles.bodyAccentInline, { color: colors.typeKicker.bills }]}>Deadlines.</Text>{"\n"}
        <Text style={[styles.bodyHandInline, { color: colors.typeKicker.todo }]}>Growing projects.</Text>{" "}
        Random thoughts.{"\n"}
        <Text style={[styles.bodyHandInline, { color: colors.inkMuted }]}>They all needed somewhere to live.</Text>
      </ThemedText>
    );
  }

  if (panel.id === "shapes") {
    return (
      <ThemedText type="body" style={styles.body}>
        <Text
          style={[styles.bodyHandInline, { color: colors.typeKicker.ideas }]}
        >
          A passing thought.
        </Text>
        {"\n"}A deadline, like paying taxes.{"\n"}
        <Text
          style={[styles.bodyHandInline, { color: colors.typeKicker.ideas }]}
        >
          An idea for a book I might write one day.
        </Text>
        {"\n"}A project that could take months to complete.
      </ThemedText>
    );
  }

  if (panel.id === "friction") {
    return (
      <ThemedText type="body" style={styles.body}>
        <Text
          style={[styles.bodyHandInline, { color: colors.typeKicker.ideas }]}
        >
          Notes were quick,
        </Text>{" "}
        but became disconnected piles.{"\n"}
        <Text
          style={[styles.bodyHandInline, { color: colors.typeKicker.todo }]}
        >
          Project tools were powerful,
        </Text>{" "}
        but too rigid for a thought that had just appeared.
      </ThemedText>
    );
  }

  if (panel.id === "insight") {
    return (
      <ThemedText type="body" style={styles.body}>
        I needed one place that could move at the{" "}
        <Text
          style={[styles.bodyHandInline, { color: colors.typeKicker.todo }]}
        >
          speed of thought
        </Text>{" "}
        while still giving shape to everything that mattered.
      </ThemedText>
    );
  }

  if (panel.id === "continuity") {
    return (
      <ThemedText type="body" style={styles.body}>
        They can still live in the{" "}
        <Text
          style={[styles.bodyAccentInline, { color: colors.typeKicker.todo }]}
        >
          same place
        </Text>
        , from the first thought to the finished project.
      </ThemedText>
    );
  }

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

function FieldScene({
  stage,
  colors,
}: {
  stage: SceneStage;
  colors: ThemeColors;
}): React.ReactElement {
  return (
    <View
      style={styles.scene}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={[styles.sceneFrame, { backgroundColor: colors.surfaceSubtle }]}
      >
        {stage === 0 ? <OriginScene colors={colors} /> : null}
        {stage === 1 ? <ShapesScene colors={colors} /> : null}
        {stage === 2 ? <FrictionScene colors={colors} /> : null}
        {stage === 3 ? <InsightScene colors={colors} /> : null}
        {stage === 4 ? <GrowthScene colors={colors} /> : null}
        {stage === 5 ? <PromiseScene colors={colors} /> : null}
      </View>
    </View>
  );
}

function OriginScene({ colors }: { colors: ThemeColors }): React.ReactElement {
  return (
    <View style={styles.originScene}>
      <View style={[styles.originField, { backgroundColor: colors.surface }]}>
        <View style={styles.originHeader}>
          <Text style={[styles.sceneLabel, { color: colors.inkMuted }]}>ONE PLACE</Text>
          <Text style={[styles.originCount, { color: colors.inkMuted }]}>04 THREADS</Text>
        </View>
        <View style={styles.originCanvas}>
          <View
            style={[
              styles.originCard,
              styles.originIdeaCard,
              { backgroundColor: colors.typeTint.ideas },
            ]}
          >
            <Text style={[styles.originCardLabel, { color: colors.typeKicker.ideas }]}>idea</Text>
            <Text style={[styles.originIdeaText, { color: colors.ink }]}>maybe write a book</Text>
          </View>
          <View
            style={[
              styles.originCard,
              styles.originDeadlineCard,
              { backgroundColor: colors.typeTint.bills },
            ]}
          >
            <Text style={[styles.originCardLabel, { color: colors.typeKicker.bills }]}>deadline</Text>
            <Text style={[styles.originDeadlineText, { color: colors.ink }]}>30 June</Text>
          </View>
          <View
            style={[
              styles.originCard,
              styles.originProjectCard,
              { backgroundColor: colors.typeTint.todo },
            ]}
          >
            <Text style={[styles.originCardLabel, { color: colors.typeKicker.todo }]}>growing project</Text>
            <Text style={[styles.originProjectText, { color: colors.ink }]}>book project</Text>
            <View style={styles.originProjectLines}>
              <View style={[styles.originProjectLine, { backgroundColor: colors.type.todo }]} />
              <View
                style={[
                  styles.originProjectLine,
                  styles.originProjectLineShort,
                  { backgroundColor: colors.inkMuted },
                ]}
              />
            </View>
          </View>
          <View style={[styles.originThought, { backgroundColor: colors.surfaceSubtle }]}>
            <Text style={[styles.originThoughtText, { color: colors.inkMuted }]}>random thought</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function ShapesScene({ colors }: { colors: ThemeColors }): React.ReactElement {
  return (
    <View style={styles.sceneStack}>
      <MiniEntry
        tone="idea"
        label="Maybe write a book"
        detail="an idea for one day"
        colors={colors}
      />
      <MiniEntry
        tone="deadline"
        label="Pay the taxes"
        detail="30 June"
        colors={colors}
      />
      <MiniEntry
        tone="todo"
        label="Build the first chapter"
        detail="part of a larger project"
        colors={colors}
      />
    </View>
  );
}

function FrictionScene({
  colors,
}: {
  colors: ThemeColors;
}): React.ReactElement {
  return (
    <View style={styles.splitScene}>
      <View style={[styles.splitPane, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sceneLabel, { color: colors.inkMuted }]}>
          NOTES
        </Text>
        <View
          style={[styles.notePile, { backgroundColor: colors.surfaceSubtle }]}
        />
        <View
          style={[
            styles.notePile,
            styles.notePileOffset,
            { backgroundColor: colors.type.ideas },
          ]}
        />
        <Text style={[styles.sceneHint, { color: colors.inkMuted }]}>
          fast, then scattered
        </Text>
      </View>
      <View style={[styles.splitPane, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sceneLabel, { color: colors.inkMuted }]}>
          PROJECTS
        </Text>
        <View style={styles.rigidGrid}>
          <View
            style={[styles.rigidBlock, { backgroundColor: colors.type.todo }]}
          />
          <View
            style={[
              styles.rigidBlock,
              { backgroundColor: colors.surfaceSubtle },
            ]}
          />
          <View
            style={[
              styles.rigidBlock,
              { backgroundColor: colors.surfaceSubtle },
            ]}
          />
          <View
            style={[
              styles.rigidBlock,
              { backgroundColor: colors.surfaceSubtle },
            ]}
          />
        </View>
        <Text style={[styles.sceneHint, { color: colors.inkMuted }]}>
          powerful, then rigid
        </Text>
      </View>
    </View>
  );
}

function InsightScene({ colors }: { colors: ThemeColors }): React.ReactElement {
  return (
    <View style={styles.insightScene}>
      <View style={[styles.insightModule, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sceneLabel, { color: colors.inkMuted }]}>
          CAPTURE
        </Text>
        <View style={styles.captureSignal}>
          <View
            style={[styles.miniDot, { backgroundColor: colors.type.ideas }]}
          />
          <View
            style={[styles.captureLine, { backgroundColor: colors.inkMuted }]}
          />
        </View>
        <Text style={[styles.sceneHint, { color: colors.inkMuted }]}>
          before it is gone
        </Text>
      </View>
      <View style={styles.insightBridge}>
        <View
          style={[styles.bridgeDot, { backgroundColor: colors.type.ideas }]}
        />
        <View
          style={[styles.bridgeLine, { backgroundColor: colors.type.ideas }]}
        />
        <View
          style={[styles.bridgeDot, { backgroundColor: colors.type.todo }]}
        />
      </View>
      <View style={[styles.insightModule, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sceneLabel, { color: colors.inkMuted }]}>
          FIELD
        </Text>
        <View
          style={[
            styles.settledThought,
            { backgroundColor: colors.typeTint.ideas },
          ]}
        >
          <View
            style={[styles.miniDot, { backgroundColor: colors.type.ideas }]}
          />
          <Text style={[styles.settledLabel, { color: colors.ink }]}>
            has a place
          </Text>
        </View>
        <Text style={[styles.sceneHint, { color: colors.inkMuted }]}>
          with shape
        </Text>
      </View>
    </View>
  );
}

function GrowthScene({ colors }: { colors: ThemeColors }): React.ReactElement {
  return (
    <View style={styles.growthScene}>
      <MiniEntry tone="idea" label="Maybe write a book" colors={colors} />
      <View
        style={[styles.growthLink, { backgroundColor: colors.type.ideas }]}
      />
      <View style={[styles.projectBlock, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sceneLabel, { color: colors.inkMuted }]}>
          PROJECT
        </Text>
        <Text style={[styles.projectTitle, { color: colors.ink }]}>
          Book project
        </Text>
        <View style={styles.projectLines}>
          <View
            style={[styles.projectLine, { backgroundColor: colors.type.todo }]}
          />
          <View
            style={[
              styles.projectLine,
              styles.projectLineShort,
              { backgroundColor: colors.surfaceSubtle },
            ]}
          />
        </View>
      </View>
      <MiniEntry
        tone="deadline"
        label="Pay the taxes"
        detail="30 June"
        colors={colors}
      />
    </View>
  );
}

function PromiseScene({ colors }: { colors: ThemeColors }): React.ReactElement {
  return (
    <View style={styles.promiseScene}>
      <View
        style={[styles.promiseReadout, { backgroundColor: colors.surface }]}
      >
        <Text style={[styles.sceneLabel, { color: colors.inkMuted }]}>
          THE FIELD
        </Text>
        <Text style={[styles.promiseReadoutText, { color: colors.ink }]}>
          everything in sight
        </Text>
      </View>
      <View style={[styles.promiseMap, { backgroundColor: colors.surface }]}>
        <View
          style={[
            styles.promiseNode,
            styles.promiseNodeA,
            { backgroundColor: colors.type.bills },
          ]}
        />
        <View
          style={[
            styles.promiseNode,
            styles.promiseNodeB,
            { backgroundColor: colors.type.todo },
          ]}
        />
        <View
          style={[
            styles.promiseNode,
            styles.promiseNodeC,
            { backgroundColor: colors.type.ideas },
          ]}
        />
        <View
          style={[
            styles.promiseCenter,
            { backgroundColor: colors.surfaceSubtle },
          ]}
        >
          <Text style={[styles.sceneLabel, { color: colors.inkMuted }]}>
            ONE PLACE
          </Text>
          <Text style={[styles.promiseCenterText, { color: colors.ink }]}>
            still here
          </Text>
        </View>
      </View>
      <Text style={[styles.finalNote, { color: colors.inkMuted }]}>
        from thought to project
      </Text>
    </View>
  );
}

function MiniEntry({
  tone,
  label,
  detail,
  colors,
}: {
  tone: EntryTone;
  label: string;
  detail?: string;
  colors: ThemeColors;
}): React.ReactElement {
  const toneColor =
    tone === "deadline"
      ? colors.type.bills
      : tone === "idea"
        ? colors.type.ideas
        : colors.type.todo;

  return (
    <View style={[styles.miniEntry, { backgroundColor: colors.surface }]}>
      <View style={[styles.miniDot, { backgroundColor: toneColor }]} />
      <View style={styles.miniCopy}>
        <Text style={[styles.miniLabel, { color: colors.ink }]}>{label}</Text>
        {detail ? (
          <Text style={[styles.miniDetail, { color: colors.inkMuted }]}>
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
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
    paddingHorizontal: tokens.space.xxl,
    paddingVertical: tokens.space.lg,
  },
  copy: {
    gap: tokens.space.md,
    paddingTop: tokens.space.xxl,
  },
  title: {
    maxWidth: 440,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.4,
    fontFamily: tokens.type.fontInter.semiBold,
  },
  emphasisTitle: {
    fontFamily: tokens.type.fontInter.bold,
  },
  body: {
    maxWidth: 440,
    fontSize: 16,
    lineHeight: 24,
  },
  originBody: {
    maxWidth: 440,
  },
  bodyAccentInline: {
    fontFamily: tokens.type.fontInter.semiBold,
  },
  bodyHandInline: {
    fontFamily: tokens.type.fontHand.regular,
    fontSize: 20,
    lineHeight: 24,
  },
  promiseCopy: {
    gap: tokens.space.xs,
  },
  promiseLine: {
    maxWidth: 440,
  },
  promiseLineHand: {
    maxWidth: 440,
    fontSize: 20,
    lineHeight: 25,
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

  scene: {
    width: "100%",
    height: 224,
  },
  sceneFrame: {
    flex: 1,
    borderRadius: tokens.radius.lg,
    justifyContent: "center",
    padding: tokens.space.lg,
    overflow: "hidden",
  },
  originScene: {
    flex: 1,
  },
  originField: {
    flex: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.md,
  },
  originHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  originCount: {
    fontFamily: tokens.type.fontMono.medium,
    fontSize: tokens.type.micro.size,
    lineHeight: tokens.type.micro.lineHeight,
    letterSpacing: 0.7,
  },
  originCanvas: {
    flex: 1,
    position: "relative",
    marginTop: tokens.space.sm,
  },
  originCard: {
    position: "absolute",
    borderRadius: tokens.radius.md,
    padding: tokens.space.sm,
    shadowColor: tokens.color.scrim.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 1,
  },
  originIdeaCard: {
    top: 8,
    left: 4,
    width: "60%",
    minHeight: 62,
    transform: [{ rotate: "-3deg" }],
  },
  originDeadlineCard: {
    top: 2,
    right: 4,
    width: "30%",
    minHeight: 62,
    transform: [{ rotate: "4deg" }],
  },
  originProjectCard: {
    bottom: 2,
    left: "16%",
    width: "64%",
    minHeight: 70,
    transform: [{ rotate: "1deg" }],
  },
  originCardLabel: {
    fontFamily: tokens.type.fontMono.medium,
    fontSize: tokens.type.micro.size,
    lineHeight: tokens.type.micro.lineHeight,
    letterSpacing: 0.5,
  },
  originIdeaText: {
    fontFamily: tokens.type.fontHand.medium,
    fontSize: 18,
    lineHeight: 23,
    marginTop: tokens.space.xs,
  },
  originDeadlineText: {
    fontFamily: tokens.type.fontMono.bold,
    fontSize: 17,
    lineHeight: 22,
    marginTop: tokens.space.sm,
  },
  originProjectText: {
    fontFamily: tokens.type.fontInter.semiBold,
    fontSize: 14,
    lineHeight: 18,
    marginTop: tokens.space.xs,
  },
  originProjectLines: {
    gap: tokens.space.xs,
    paddingTop: tokens.space.xs,
  },
  originProjectLine: {
    width: "72%",
    height: 4,
    borderRadius: tokens.radius.pill,
  },
  originProjectLineShort: {
    width: "44%",
    opacity: 0.4,
  },
  originThought: {
    position: "absolute",
    right: 8,
    bottom: 44,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
    borderRadius: tokens.radius.sm,
    transform: [{ rotate: "-5deg" }],
  },
  originThoughtText: {
    fontFamily: tokens.type.fontHand.regular,
    fontSize: 16,
    lineHeight: 20,
  },
  sceneStack: {
    gap: tokens.space.sm,
  },
  miniEntry: {
    minHeight: 48,
    borderRadius: tokens.radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: tokens.radius.pill,
  },
  miniCopy: {
    flex: 1,
    gap: 1,
  },
  miniLabel: {
    fontFamily: tokens.type.fontInter.medium,
    fontSize: 14,
    lineHeight: 18,
  },
  miniDetail: {
    fontFamily: tokens.type.fontMono.regular,
    fontSize: 10,
    lineHeight: 13,
  },
  splitScene: {
    flexDirection: "row",
    gap: tokens.space.sm,
  },
  splitPane: {
    flex: 1,
    minHeight: 148,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    gap: tokens.space.sm,
  },
  sceneLabel: {
    fontFamily: tokens.type.fontMono.medium,
    fontSize: tokens.type.micro.size,
    lineHeight: tokens.type.micro.lineHeight,
    letterSpacing: tokens.type.micro.tracking,
  },
  sceneHint: {
    fontFamily: tokens.type.fontHand.regular,
    fontSize: 17,
    lineHeight: 21,
    marginTop: "auto",
  },
  insightScene: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: tokens.space.xs,
  },
  insightModule: {
    flex: 1,
    minHeight: 136,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    gap: tokens.space.sm,
  },
  captureSignal: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingTop: tokens.space.md,
  },
  captureLine: {
    flex: 1,
    height: 4,
    borderRadius: tokens.radius.pill,
    opacity: 0.6,
  },
  insightBridge: {
    width: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.xs,
  },
  bridgeDot: {
    width: 7,
    height: 7,
    borderRadius: tokens.radius.pill,
  },
  bridgeLine: {
    width: 2,
    height: 32,
    borderRadius: tokens.radius.pill,
  },
  settledThought: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.sm,
    borderRadius: tokens.radius.sm,
    marginTop: tokens.space.md,
  },
  settledLabel: {
    flex: 1,
    fontFamily: tokens.type.fontInter.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  notePile: {
    width: "82%",
    height: 42,
    borderRadius: tokens.radius.sm,
    transform: [{ rotate: "-4deg" }],
  },
  notePileOffset: {
    position: "absolute",
    top: 52,
    left: 22,
    transform: [{ rotate: "5deg" }],
  },
  rigidGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.xs,
  },
  rigidBlock: {
    width: "46%",
    height: 34,
    borderRadius: tokens.radius.sm,
  },
  growthScene: {
    gap: tokens.space.sm,
  },
  growthLink: {
    width: 3,
    height: 16,
    marginLeft: 22,
    borderRadius: tokens.radius.pill,
  },
  projectBlock: {
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    gap: tokens.space.xs,
  },
  projectTitle: {
    fontFamily: tokens.type.fontInter.semiBold,
    fontSize: 16,
    lineHeight: 21,
  },
  projectLines: {
    gap: tokens.space.xs,
    paddingTop: tokens.space.xs,
  },
  projectLine: {
    width: "68%",
    height: 4,
    borderRadius: tokens.radius.pill,
  },
  projectLineShort: {
    width: "42%",
  },
  promiseScene: {
    gap: tokens.space.md,
  },
  promiseReadout: {
    minHeight: 50,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.sm,
  },
  promiseReadoutText: {
    flex: 1,
    textAlign: "right",
    fontFamily: tokens.type.fontInter.semiBold,
    fontSize: 15,
    lineHeight: 20,
  },
  promiseMap: {
    height: 118,
    borderRadius: tokens.radius.md,
    position: "relative",
    overflow: "hidden",
  },
  promiseCenter: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 132,
    minHeight: 58,
    marginLeft: -66,
    marginTop: -29,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.xs,
  },
  promiseCenterText: {
    fontFamily: tokens.type.fontInter.semiBold,
    fontSize: 15,
    lineHeight: 19,
  },
  promiseNode: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: tokens.radius.pill,
  },
  promiseNodeA: {
    top: 22,
    left: 34,
  },
  promiseNodeB: {
    top: 74,
    right: 42,
  },
  promiseNodeC: {
    bottom: 20,
    left: 88,
  },
  finalNote: {
    fontFamily: tokens.type.fontHand.regular,
    fontSize: 18,
    lineHeight: 22,
    paddingLeft: tokens.space.xs,
  },
});
