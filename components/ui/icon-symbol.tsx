import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type IconSymbolName = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface IconSymbolProps {
  name: IconSymbolName;
  size?: number;
  color: string;
}

/**
 * Cross-platform icon component backed by MaterialCommunityIcons from
 * @expo/vector-icons. Use MaterialCommunityIcons name strings for `name`.
 */
export function IconSymbol({ name, size = 24, color }: IconSymbolProps): React.ReactElement {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}
