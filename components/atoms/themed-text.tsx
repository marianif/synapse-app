import { StyleSheet, Text } from "react-native";

import {
  Colors,
  FontFamily,
  FontSize,
  LetterSpacing,
  LineHeight,
  TextColors,
} from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

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
  const scheme = useColorScheme();
  const color = muted ? TextColors.secondary : Colors[scheme].text;

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
    fontSize: FontSize.displayLg,
    lineHeight: LineHeight.displayLg,
    letterSpacing: LetterSpacing.displayLg,
    fontFamily: FontFamily.bold,
  },
  headline: {
    fontSize: FontSize.headlineSm,
    lineHeight: LineHeight.headlineSm,
    fontFamily: FontFamily.semiBold,
  },
  body: {
    fontSize: FontSize.bodyMd,
    lineHeight: LineHeight.bodyMd,
    fontFamily: FontFamily.regular,
  },
  bodyBold: {
    fontSize: FontSize.bodyMd,
    lineHeight: LineHeight.bodyMd,
    fontFamily: FontFamily.semiBold,
  },
  label: {
    fontSize: FontSize.labelSm,
    lineHeight: LineHeight.labelSm,
    letterSpacing: LetterSpacing.labelSm,
    fontFamily: FontFamily.semiBold,
    textTransform: "uppercase",
  },
  caption: {
    fontSize: FontSize.labelXs,
    lineHeight: LineHeight.labelSm,
    fontFamily: FontFamily.regular,
  },
});
