import { View } from 'react-native';

import { useSurfaceColor } from '@/constants/theme';

import type { SurfaceLayer } from '@/constants/theme';
import type { ViewProps } from 'react-native';

export type { SurfaceLayer };

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
  const backgroundColor = useSurfaceColor(surface);

  return (
    <View style={[{ backgroundColor }, style]} {...rest}>
      {children}
    </View>
  );
}
