import { router } from 'expo-router';
import { FlaskConical, Palette, Trash } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { confirm } from '@/components/confirm';
import { sampleActivities, useSettings, useStore } from '@/data';
import { Button, Chip, ListRow, Text, useToast } from '@/ui';

export default function SettingsScreen() {
  const store = useStore();
  const toast = useToast();
  const { data: settings } = useSettings();

  async function addSamples() {
    let added = 0;
    for (const a of sampleActivities()) if (!(await store.insertActivity(a)).duplicate) added++;
    toast(added ? `${added} sample activities added` : 'Samples are already here');
  }

  async function wipe() {
    const ok = await confirm({
      title: 'Delete everything?',
      message: 'All activities, story designs and settings on this phone are removed. This can’t be undone.',
      confirmLabel: 'Delete everything',
      destructive: true,
    });
    if (!ok) return;
    await store.wipe();
    toast('All data deleted');
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <Section title="Units">
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Units">
          <Chip label="Miles and feet" variant="toggle" selected={settings.units === 'mi'} onPress={() => store.setSettings({ units: 'mi' })} />
          <Chip label="Kilometres and metres" variant="toggle" selected={settings.units === 'km'} onPress={() => store.setSettings({ units: 'km' })} />
        </View>
      </Section>

      <Section title="Try it out">
        <Text variant="sm" color="textMuted">
          No workout file handy? Add a few made-up activities to play with.
        </Text>
        <Button label="Add sample activities" icon={FlaskConical} variant="secondary" onPress={addSamples} />
      </Section>

      <Section title="Your data">
        <Text variant="sm" color="textMuted">
          Everything stays on this phone. Nothing is uploaded.
        </Text>
        <Button label="Delete all data" icon={Trash} variant="danger" onPress={wipe} />
      </Section>

      {__DEV__ && (
        <View style={{ marginTop: 8 }}>
          <ListRow icon={Palette} title="Design system" subtitle="Tokens and components (dev only)" onPress={() => router.push('/design')} />
        </View>
      )}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="footnote" color="textMuted" uppercase>
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 16, paddingTop: 24, gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
