import { StyleSheet, Text } from "react-native";

import { useTheme, tokens } from "@/constants/theme";

import type { TextProps } from "react-native";

export type TextType =
  | "display" // 30pt Fraunces — home greeting
  | "headline" // 22pt Fraunces — tile / section title (alias of title)
  | "title" // 22pt Fraunces — tile / section title
  | "item" // 17pt Inter — entry titles inside tiles
  | "body" // 14pt Inter — detail / supporting
  | "bodyBold" // 14pt Inter semibold
  | "label" // 11pt all-caps Inter kicker
  | "caption"; // 11pt Inter, no transform

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

// Fonts are loaded in app/_layout.tsx via useFonts and splash-gated. Hierarchy is
// serif-vs-sans (DESIGN.md): Fraunces carries display/title, Inter carries the body.
const styles = StyleSheet.create({
  base: {},
  display: {
    fontSize: tokens.type.display.size,
    lineHeight: tokens.type.display.lineHeight,
    letterSpacing: tokens.type.display.tracking,
    fontFamily: tokens.type.fontFraunces.semiBold,
  },
  headline: {
    fontSize: tokens.type.title.size,
    lineHeight: tokens.type.title.lineHeight,
    letterSpacing: tokens.type.title.tracking,
    fontFamily: tokens.type.fontFraunces.semiBold,
  },
  title: {
    fontSize: tokens.type.title.size,
    lineHeight: tokens.type.title.lineHeight,
    letterSpacing: tokens.type.title.tracking,
    fontFamily: tokens.type.fontFraunces.semiBold,
  },
  item: {
    fontSize: tokens.type.item.size,
    lineHeight: tokens.type.item.lineHeight,
    fontFamily: tokens.type.fontInter.medium,
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
