import { Text, StyleSheet } from 'react-native';

import { Colors, FontSize, LetterSpacing, LineHeight, TextColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import type { TextProps } from 'react-native';

export type TextType =
  | 'display'    // 48pt hero counter
  | 'headline'   // 24pt card title
  | 'body'       // 14pt task description
  | 'bodyBold'   // 14pt bold
  | 'label'      // 11pt all-caps metadata
  | 'caption';   // 10pt extra-small

interface ThemedTextProps extends TextProps {
  type?: TextType;
  muted?: boolean;
}

/**
 * Typography atom. Applies the Synapse editorial type scale from theme.ts.
 * Use `type` to select the scale and `muted` for secondary text color.
 */
export function ThemedText({
  type = 'body',
  muted = false,
  style,
  children,
  ...rest
}: ThemedTextProps): React.ReactElement {
  const scheme = useColorScheme();
  const color = muted
    ? TextColors.secondary
    : Colors[scheme].text;

  return (
    <Text style={[styles.base, styles[type], { color }, style]} {...rest}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: 'System',
  },
  display: {
    fontSize: FontSize.displayLg,
    lineHeight: LineHeight.displayLg,
    letterSpacing: LetterSpacing.displayLg,
    fontWeight: '700',
  },
  headline: {
    fontSize: FontSize.headlineSm,
    lineHeight: LineHeight.headlineSm,
    fontWeight: '600',
  },
  body: {
    fontSize: FontSize.bodyMd,
    lineHeight: LineHeight.bodyMd,
    fontWeight: '400',
  },
  bodyBold: {
    fontSize: FontSize.bodyMd,
    lineHeight: LineHeight.bodyMd,
    fontWeight: '600',
  },
  label: {
    fontSize: FontSize.labelSm,
    lineHeight: LineHeight.labelSm,
    letterSpacing: LetterSpacing.labelSm,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  caption: {
    fontSize: FontSize.labelXs,
    lineHeight: LineHeight.labelSm,
    fontWeight: '400',
  },
});
