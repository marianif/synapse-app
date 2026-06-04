import { StyleSheet, Text } from "react-native";

import { useTheme, tokens } from "@/constants/theme";

import type { TextProps } from "react-native";

export type TextType =
  | "display" // 28pt Inter bold — home greeting
  | "headline" // 20pt Inter bold — tile / section title (alias of title)
  | "title" // 20pt Inter bold — tile / section title
  | "item" // 16pt Inter — entry titles inside tiles
  | "body" // 14pt Inter — detail / supporting
  | "bodyBold" // 14pt Inter semibold
  | "label" // 11pt all-caps mono kicker
  | "micro" // 10pt all-caps mono — sub-kicker dividers / tertiary metadata
  | "mono" // 13pt mono — counts / status / time
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
// sans + mono (DESIGN.md): Inter carries display/title/body, JetBrains Mono carries
// the signal layer (kicker label + mono counts/status). Hierarchy = size + weight.
const styles = StyleSheet.create({
  base: {},
  display: {
    fontSize: tokens.type.display.size,
    lineHeight: tokens.type.display.lineHeight,
    letterSpacing: tokens.type.display.tracking,
    fontFamily: tokens.type.fontInter.bold,
  },
  headline: {
    fontSize: tokens.type.title.size,
    lineHeight: tokens.type.title.lineHeight,
    letterSpacing: tokens.type.title.tracking,
    fontFamily: tokens.type.fontInter.bold,
  },
  title: {
    fontSize: tokens.type.title.size,
    lineHeight: tokens.type.title.lineHeight,
    letterSpacing: tokens.type.title.tracking,
    fontFamily: tokens.type.fontInter.bold,
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
    fontFamily: tokens.type.fontMono.medium,
    textTransform: "uppercase",
  },
  micro: {
    fontSize: tokens.type.micro.size,
    lineHeight: tokens.type.micro.lineHeight,
    letterSpacing: tokens.type.micro.tracking,
    fontFamily: tokens.type.fontMono.medium,
    textTransform: "uppercase",
  },
  mono: {
    fontSize: tokens.type.mono.size,
    lineHeight: tokens.type.mono.lineHeight,
    fontFamily: tokens.type.fontMono.medium,
  },
  caption: {
    fontSize: tokens.type.kicker.size,
    lineHeight: tokens.type.kicker.lineHeight,
    fontFamily: tokens.type.fontInter.regular,
  },
});
