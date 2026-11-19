import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Activity as ActivityIcon, FlaskConical, HeartPulse, LifeBuoy, Link2, Palette, RefreshCw, Trash, Unlink } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { confirm } from '@/components/confirm';
import { SourceCard } from '@/components/SourceCard';
import { sampleActivities, useSettings, useStore } from '@/data';
import { describeSync, syncErrorMessage, timeAgo, useHealth, useStrava } from '@/features/sources';
import { deauthorize } from '@/integrations/strava/client';
import { stravaTokens } from '@/integrations/strava/tokens';
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
      message: 'All activities, story designs, settings and connections on this phone are removed. This can’t be undone.',
      confirmLabel: 'Delete everything',
      destructive: true,
    });
    if (!ok) return;
    await deauthorize(stravaTokens);
    await store.wipe();
    toast('All data deleted');
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <Section title="Connections">
        <HealthCard />
        <StravaCard />
      </Section>

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

      <View style={{ marginTop: 16 }}>
        <ListRow icon={LifeBuoy} title="Help and feedback" subtitle="Common questions, and how to reach us" onPress={() => router.push('/help')} />
      </View>

      <Text variant="caption" color="textMuted" align="center" style={{ marginTop: 32 }}>
        Mileprint {Constants.expoConfig?.version ?? ''} · No account. Your runs stay on this phone.
      </Text>

      {__DEV__ && (
        <View style={{ marginTop: 8 }}>
          <ListRow icon={Palette} title="Design system" subtitle="Tokens and components (dev only)" onPress={() => router.push('/design')} />
        </View>
      )}
    </ScrollView>
  );
}

function HealthCard() {
  const health = useHealth();
  const toast = useToast();
  const report = (e: unknown) => {
    const msg = syncErrorMessage(e);
    if (msg) toast(msg);
  };
  if (!health.available) {
    return (
      <SourceCard
        icon={HeartPulse}
        name="Apple Health"
        status="Needs the full app"
        note="Apple Health works in the installed app, not in Expo Go or the browser."
      />
    );
  }
  if (!health.connected) {
    return (
      <SourceCard icon={HeartPulse} name="Apple Health" status="Not connected" note="Includes Apple Watch workouts. Read-only: nothing is written to Health.">
        <Button
          label="Connect Apple Health"
          icon={Link2}
          loading={health.busy === 'connect'}
          onPress={() =>
            health.connect().then((r) => toast(r.added || r.merged ? describeSync(r) : 'Connected. No workouts found yet; check Health permissions if that’s wrong.'), report)
          }
        />
      </SourceCard>
    );
  }
  return (
    <SourceCard icon={HeartPulse} name="Apple Health" status={`Connected · synced ${timeAgo(health.syncedAt)}`}>
      <Button
        label="Sync now"
        icon={RefreshCw}
        variant="secondary"
        size="sm"
        loading={health.busy === 'sync'}
        onPress={() => health.sync().then((r) => toast(describeSync(r)), report)}
      />
      <Button label="Stop syncing" icon={Unlink} variant="danger" size="sm" onPress={() => health.disconnect().then(() => toast('Apple Health sync stopped'))} />
    </SourceCard>
  );
}

function StravaCard() {
  const strava = useStrava();
  const toast = useToast();
  const report = (e: unknown) => {
    const msg = syncErrorMessage(e);
    if (msg) toast(msg);
  };

  if (!strava.configured) {
    return (
      <SourceCard
        icon={ActivityIcon}
        name="Strava"
        status="Not set up in this build"
        note="Add the Strava keys described in SETUP.md, then rebuild."
      />
    );
  }
  if (!strava.connected) {
    return (
      <SourceCard
        icon={ActivityIcon}
        name="Strava"
        status="Not connected"
        note="Compatible with Strava. Reads your activities to make stories. Nothing is posted to Strava.">
        <Button
          label="Connect to Strava"
          icon={Link2}
          loading={strava.busy === 'connect'}
          onPress={() => strava.connect().then((r) => toast(`Strava connected. ${describeSync(r)}`), report)}
        />
      </SourceCard>
    );
  }
  return (
    <SourceCard icon={ActivityIcon} name="Strava" status={`${strava.athlete} · synced ${timeAgo(strava.syncedAt)}`}>
      <Button
        label="Sync now"
        icon={RefreshCw}
        variant="secondary"
        size="sm"
        loading={strava.busy === 'sync'}
        onPress={() => strava.sync().then((r) => toast(describeSync(r)), report)}
      />
      <Button
        label="Disconnect"
        icon={Unlink}
        variant="danger"
        size="sm"
        loading={strava.busy === 'disconnect'}
        onPress={async () => {
          const ok = await confirm({
            title: 'Disconnect Strava?',
            message: 'Activities that came from Strava, and their story designs, are removed from this phone.',
            confirmLabel: 'Disconnect',
            destructive: true,
          });
          if (ok) strava.disconnect().then((n) => toast(`Disconnected. ${n} Strava activities removed.`), report);
        }}
      />
    </SourceCard>
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
