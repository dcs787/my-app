import { Alert, Platform } from 'react-native';

/** A yes/no question. Native alert on device; window.confirm on web (Alert is a no-op there). */
export function confirm(opts: { title: string; message?: string; confirmLabel: string; destructive?: boolean }): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm([opts.title, opts.message].filter(Boolean).join('\n\n')));
  }
  return new Promise((resolve) => {
    Alert.alert(opts.title, opts.message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: opts.confirmLabel, style: opts.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}
