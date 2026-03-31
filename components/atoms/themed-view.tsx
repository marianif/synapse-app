import { View } from 'react-native';

import { Surface } from '@/constants/theme';

import type { ViewProps } from 'react-native';

export type SurfaceLayer =
  | 'base'
  | 'containerLow'
  | 'container'
  | 'containerHigh'
  | 'containerHighest'
  | 'containerLowest';

interface ThemedViewProps extends ViewProps {
  surface?: SurfaceLayer;
}

/**
 * Surface-aware View atom. Sets backgroundColor from the tonal surface
 * hierarchy defined in theme.ts — the primary tool for expressing depth
 * without borders.
 */
export function ThemedView({
  surface = 'base',
  style,
  children,
  ...rest
}: ThemedViewProps): React.ReactElement {
  return (
    <View style={[{ backgroundColor: Surface[surface] }, style]} {...rest}>
      {children}
    </View>
  );
}
