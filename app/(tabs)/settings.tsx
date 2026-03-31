import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/atoms/themed-text';
import { Surface } from '@/constants/theme';

export default function SettingsScreen(): React.ReactElement {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.screen}>
        <ThemedText type="headline" style={styles.placeholder}>
          Settings
        </ThemedText>
        <ThemedText type="body" muted style={styles.sub}>
          Preferences coming soon.
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Surface.base,
  },
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholder: {
    opacity: 0.4,
  },
  sub: {
    opacity: 0.3,
  },
});
