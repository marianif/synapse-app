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
        d="M60 18L24 82L96 82Z M60 18L72 8 M24 82L36 72 M96 82L108 72 M36 72L72 8L108 72Z"
        stroke={colors.ink}
        strokeWidth={2.25}
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <Circle cx="60" cy="18" r="8" fill={colors.type.bills} />
      <Circle cx="24" cy="82" r="8" fill={colors.type.todo} />
      <Circle cx="96" cy="82" r="8" fill={colors.type.ideas} />
    </Svg>
  );
}
