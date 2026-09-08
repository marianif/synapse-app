import * as ReiconIcons from 'reicon-react-native';
import type { IconComponent, IconWeight } from 'reicon-react-native';

export type IconSymbolName = Exclude<keyof typeof ReiconIcons, 'createIcon'>;

interface IconSymbolProps {
  name: IconSymbolName;
  size?: number;
  color: string;
  /** Outline or Filled. Defaults to Outline — reicon's own default. */
  weight?: IconWeight;
}

/**
 * Cross-platform icon component backed by Reicon (reicon-react-native).
 * `name` is any icon export from 'reicon-react-native' — see https://reicon.dev/icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  weight = 'Outline',
}: IconSymbolProps): React.ReactElement {
  const Icon = ReiconIcons[name] as IconComponent;
  return <Icon size={size} color={color} weight={weight} />;
}