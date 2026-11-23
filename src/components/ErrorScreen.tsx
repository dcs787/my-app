import { router, type ErrorBoundaryProps } from 'expo-router';
import { RotateCcw, TriangleAlert } from '@/ui/icons';
import { Linking, StyleSheet, Text as RNText, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SUPPORT_EMAIL, supportMailUrl } from '@/features/support';
import { colors } from '@/theme';
import { Button, EmptyState } from '@/ui';

/**
 * Shown instead of a screen that crashed. Uses no app context (store, toasts),
 * because whatever broke may be up there. Saved data is untouched: the editor
 * autosaves, so at most the last fraction of a second of a design is lost.
 */
export function ErrorScreen({ error, retry }: ErrorBoundaryProps) {
  const insets = useSafeAreaInsets();
  const details = `What went wrong: ${error?.message ?? 'unknown'}`.slice(0, 500);
  return (
    <View style={[styles.page, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <EmptyState
        icon={TriangleAlert}
        title="Something went wrong"
        body="Your activities and designs are saved on your phone. Try again, or go back to your activities."
        actions={
          <View style={{ gap: 10, alignSelf: 'stretch' }}>
            <Button label="Try again" icon={RotateCcw} fullWidth onPress={retry} />
            <Button label="Go to activities" variant="secondary" fullWidth onPress={() => router.replace('/')} />
            {SUPPORT_EMAIL ? (
              <Button
                label="Tell us what happened"
                variant="secondary"
                fullWidth
                onPress={() => Linking.openURL(supportMailUrl('Mileprint problem', details)).catch(() => {})}
              />
            ) : null}
          </View>
        }
      />
      <RNText selectable style={styles.detail}>
        {details}
      </RNText>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', paddingHorizontal: 16 },
  detail: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 16 },
});
