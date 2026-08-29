import Svg, { Circle, Path } from "react-native-svg";

import { useTheme } from "@/constants/theme";

interface BrandMarkProps {
  /** Rendered size of the square mark. */
  size?: number;
  /** Set when the mark is the only accessible name for the brand. */
  accessibilityLabel?: string;
}

/** The Circuit Node mark, shared by the app chrome and first-run brand moment. */
export function BrandMark({
  size = 24,
  accessibilityLabel,
}: BrandMarkProps): React.ReactElement {
  const { colors } = useTheme();

  return (
    <Svg
      width={size}
      height={size}
      viewBox="14 4 100 92"
      fill="none"
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
    >
      <Path
        d="M92 23L63 34L80 61L37 76"
        stroke={colors.ink}
        strokeWidth={2.25}
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <Circle cx="92" cy="23" r="8" fill={colors.type.bills} />
      <Circle cx="80" cy="61" r="8" fill={colors.type.todo} />
      <Circle cx="37" cy="76" r="8" fill={colors.type.ideas} />
    </Svg>
  );
}
