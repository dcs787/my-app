import Constants from 'expo-constants';
import { ChevronDown, ChevronUp, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';
import { Button, Text, useToast } from '@/ui';

/** Support address from EXPO_PUBLIC_SUPPORT_EMAIL (SETUP.md). Without it, the email button is hidden. */
const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '';

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Do I need an account?',
    a: 'No. Mileprint keeps your activities and designs on this phone. There is no sign-up, feed or waitlist.',
  },
  {
    q: 'My latest workout isn’t showing',
    a: 'Watch apps save to Apple Health a minute or two after you stop. Pull down on the activity list to sync. If it still isn’t there, check Health → your profile → Apps → Mileprint and allow Workouts and Workout Routes.',
  },
  {
    q: 'Which watches and apps work?',
    a: 'Apple Watch, plus any watch app you’ve set to save workouts to Apple Health (Garmin, Coros, Polar, Suunto, Wahoo and Amazfit apps can). Also anything on Strava, and GPX, TCX or FIT files exported from any app.',
  },
  {
    q: 'Why do the same run’s numbers differ between apps?',
    a: 'Each app smooths GPS and elevation differently. Mileprint uses your device’s own totals and laps when the file or app provides them (FIT and TCX files, Strava, segments you mark on Apple Watch), and works out splits from the route otherwise. Under the list it says which.',
  },
  {
    q: 'How do I post to Instagram?',
    a: 'In the editor, tap Instagram to open the story in Instagram, ready to post. Or open Copy stickers, tap a sticker, and paste it onto any photo in your story.',
  },
  {
    q: 'How do I delete my data?',
    a: 'Settings → Delete all data removes everything on this phone and disconnects Strava. Disconnecting Strava also removes the activities that came from it.',
  },
];

export default function HelpScreen() {
  const toast = useToast();
  const [open, setOpen] = useState<number | null>(0);
  const version = Constants.expoConfig?.version ?? '';

  async function email() {
    const body = `\n\n—\nMileprint ${version} · ${Platform.OS} ${String(Platform.Version)}`;
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Mileprint feedback')}&body=${encodeURIComponent(body)}`;
    try {
      await Linking.openURL(url);
    } catch {
      toast(`No mail app set up. Write to ${SUPPORT_EMAIL}`);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      {FAQ.map((f, i) => {
        const expanded = open === i;
        const Icon = expanded ? ChevronUp : ChevronDown;
        return (
          <View key={f.q} style={styles.item}>
            <Pressable
              onPress={() => setOpen(expanded ? null : i)}
              accessibilityRole="button"
              aria-expanded={expanded}
              style={styles.q}>
              <Text variant="base" weight="600" style={{ flex: 1 }}>
                {f.q}
              </Text>
              <Icon size={18} color={colors.textMuted} />
            </Pressable>
            {expanded && (
              <Text variant="sm" color="textMuted" style={styles.a}>
                {f.a}
              </Text>
            )}
          </View>
        );
      })}
      {SUPPORT_EMAIL ? (
        <View style={{ gap: 8, marginTop: 8 }}>
          <Text variant="sm" color="textMuted">
            Something broken, or an idea? A person reads every message.
          </Text>
          <Button label="Email us" icon={Mail} fullWidth onPress={email} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 10, maxWidth: 560, width: '100%', alignSelf: 'center' },
  item: { backgroundColor: colors.surface, borderRadius: radius.md },
  q: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 52 },
  a: { paddingHorizontal: 14, paddingBottom: 14 },
});
