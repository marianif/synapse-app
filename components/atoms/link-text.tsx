import * as WebBrowser from "expo-web-browser";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
} from "react-native";

import { tokens, useTheme } from "@/constants/theme";
import { normalizeHref, splitByUrls } from "@/lib/links";

interface LinkTextProps extends Omit<TextProps, "children"> {
  /** The raw text to render; URL runs inside it become tappable links. */
  text: string;
  /** Typography of the surrounding prose — inherited by every run. */
  style?: StyleProp<TextStyle>;
  /** Typography override for URL runs (defaults to the mono signal voice). */
  linkStyle?: StyleProp<TextStyle>;
  /** Drop link runs to the muted ink when the surrounding text is muted
   *  (e.g. a completed subtask) — the mono voice and underline still carry
   *  the link affordance, just quieter. */
  muted?: boolean;
}

/**
 * Free-text renderer with inline URL recognition. Splits `text` into plain and
 * URL runs; URL runs render in the mono signal voice + the link hue, and tap
 * into the in-app browser (`expo-web-browser`). The parent `Text` still owns
 * the outer typography — callers pass their prose style and everything
 * inherits, so a link inside a handwritten note or a checklist title reads in
 * context, not as a foreign element.
 *
 * Phase 1 is recognition-only: nothing is parsed at write time and nothing is
 * stored. The tap stops propagation so a link inside a tappable card (tap to
 * edit a note, tap to rename a subtask) opens instead of falling through.
 */
export function LinkText({
  text,
  style,
  linkStyle,
  muted = false,
  ...rest
}: LinkTextProps): React.ReactElement {
  const { colors } = useTheme();
  const segments = splitByUrls(text);

  return (
    <Text style={style} {...rest}>
      {segments.map((segment, index) => {
        const url = segment.url;
        if (url === null) {
          return <Text key={index}>{segment.text}</Text>;
        }
        const href = normalizeHref(url);
        return (
          <Text
            key={index}
            accessibilityRole="link"
            accessibilityLabel={url}
            onPress={(event) => {
              event.stopPropagation();
              void WebBrowser.openBrowserAsync(href);
            }}
            style={[
              styles.link,
              { color: muted ? colors.inkMuted : colors.link },
              linkStyle,
            ]}
          >
            {segment.text}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  // The mono signal voice: the same layer that carries counts, timestamps and
  // kickers. A URL inside prose is mechanical reference, not voice — so it
  // reads in instrument-panel mono, underlined, in the link hue. Size is left
  // to the caller's linkStyle so each surface can match its prose optically.
  link: {
    fontFamily: tokens.type.fontMono.medium,
    textDecorationLine: "underline",
  },
});