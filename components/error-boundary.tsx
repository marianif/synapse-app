// migrated to v2 tokens — phase 2
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { Brand, Radius, Spacing, Surface, TextColors, tokens } from "@/constants/theme";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

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

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <ThemedText type="headline" style={styles.title}>
            Something went wrong
          </ThemedText>
          <ThemedText type="body" style={styles.body}>
            An unexpected error occurred. Your data is safe.
          </ThemedText>
          <Pressable
            onPress={this.handleReset}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <ThemedText type="label" style={styles.buttonLabel}>
              Try again
            </ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Surface.base,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  card: {
    backgroundColor: Surface.containerLow,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    width: "100%",
    gap: Spacing.lg,
    alignItems: "flex-start",
  },
  title: {
    color: TextColors.primary,
  },
  body: {
    color: TextColors.secondary,
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: Brand.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  buttonPressed: {
    backgroundColor: tokens.accent.clayPressed,
    transform: [{ scale: 0.98 }],
  },
  buttonLabel: {
    color: Surface.base,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.4,
  },
});
