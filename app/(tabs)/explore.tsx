// Unused route — kept as a valid file to satisfy Expo Router's file-based routing.
// All navigation is handled via the 4 tabs defined in _layout.tsx.
import { Redirect } from 'expo-router';

export default function ExploreRedirect(): React.ReactElement {
  return <Redirect href="/" />;
}
