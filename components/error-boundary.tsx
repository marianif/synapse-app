import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { Radius, Spacing, useTheme } from "@/constants/theme";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

function ErrorFallback({ onReset }: { onReset: () => void }): React.ReactElement {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.paper }]}>
      <View style={[styles.card, { backgroundColor: colors.surfaceSubtle }]}>
        <ThemedText type="headline" style={[styles.title, { color: colors.ink }]}>
          Something went wrong
        </ThemedText>
        <ThemedText type="body" style={[styles.body, { color: colors.inkMuted }]}>
          An unexpected error occurred. Your data is safe.
        </ThemedText>
        <Pressable
          onPress={onReset}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: pressed ? colors.accent.clayPressed : colors.accent.clay },
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <ThemedText type="label" style={[styles.buttonLabel, { color: colors.paper }]}>
            Try again
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[ErrorBoundary] Uncaught render error:", error, info);
  }

  handleReset = (): void => {
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return <ErrorFallback onReset={this.handleReset} />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    width: "100%",
    gap: Spacing.lg,
    alignItems: "flex-start",
  },
  title: {},
  body: {},
  button: {
    alignSelf: "flex-start",
    borderRadius: Radius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonLabel: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.4,
  },
});
