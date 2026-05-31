import { StyleSheet, Text } from "react-native";

import { useTheme, tokens } from "@/constants/theme";

import type { TextProps } from "react-native";

export type TextType =
  | "display" // 48pt hero counter
  | "headline" // 24pt card title
  | "body" // 14pt task description
  | "bodyBold" // 14pt bold
  | "label" // 11pt all-caps metadata
  | "caption"; // 10pt extra-small

interface ThemedTextProps extends TextProps {
  type?: TextType;
  muted?: boolean;
}

/**
 * Typography atom. Applies the Synapse editorial type scale from theme.ts.
 * Use `type` to select the scale and `muted` for secondary text color.
 */
export function ThemedText({
  type = "body",
  muted = false,
  style,
  children,
  ...rest
}: ThemedTextProps): React.ReactElement {
  const { colors } = useTheme();
  const color = muted ? colors.inkMuted : colors.ink;

  return (
    <Text style={[styles.base, styles[type], { color }, style]} {...rest}>
      {children}
    </Text>
  );
}

// TODO: wire up Inter via useFonts in app/_layout.tsx (expo-font / @expo-google-fonts/inter)
// so FontFamily tokens resolve. Until then, omitting fontFamily lets RN inherit the
// system Inter substitute rather than locking to "System".
const styles = StyleSheet.create({
  base: {
    // fontFamily intentionally omitted — see TODO above
  },
  display: {
    fontSize: tokens.type.display.size,
    lineHeight: tokens.type.display.lineHeight,
    letterSpacing: tokens.type.display.tracking,
    fontFamily: tokens.type.fontInter.bold,
  },
  headline: {
    fontSize: tokens.type.title.size,
    lineHeight: tokens.type.title.lineHeight,
    fontFamily: tokens.type.fontInter.semiBold,
  },
  body: {
    fontSize: tokens.type.body.size,
    lineHeight: tokens.type.body.lineHeight,
    fontFamily: tokens.type.fontInter.regular,
  },
  bodyBold: {
    fontSize: tokens.type.body.size,
    lineHeight: tokens.type.body.lineHeight,
    fontFamily: tokens.type.fontInter.semiBold,
  },
  label: {
    fontSize: tokens.type.kicker.size,
    lineHeight: tokens.type.kicker.lineHeight,
    letterSpacing: tokens.type.kicker.tracking,
    fontFamily: tokens.type.fontInter.semiBold,
    textTransform: "uppercase",
  },
  caption: {
    fontSize: tokens.type.kicker.size,
    lineHeight: tokens.type.kicker.lineHeight,
    fontFamily: tokens.type.fontInter.regular,
  },
});
