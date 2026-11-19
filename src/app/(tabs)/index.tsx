import { router, Stack } from 'expo-router';
import { Activity as StravaIcon, FileUp, HeartPulse, PenLine, Plus, RefreshCw } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { activityIcon } from '@/components/activityIcon';
import { useActivities, useSettings, useStore } from '@/data';
import { formatDistance, formatDuration, formatDay, SOURCE_LABEL, unitLabel } from '@/domain/format';
import type { Activity, Units } from '@/domain/types';
import { pickAndImport, summarise } from '@/features/importFiles';
import { describeSync, syncAll, syncErrorMessage, timeAgo, useHealth, useStrava } from '@/features/sources';
import { healthAvailable } from '@/integrations/health/healthkit';
import { stravaConfigured } from '@/integrations/strava/config';
import { colors, radius } from '@/theme';
import { Button, EmptyState, IconButton, ListRow, Sheet, Text, useToast } from '@/ui';

export default function ActivitiesScreen() {
  const { data: activities, loading } = useActivities();
  const { data: settings } = useSettings();
  const [addOpen, setAddOpen] = useState(false);
  const add = useAddActions(settings.units, () => setAddOpen(false));
  const store = useStore();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const anyConnected = settings.healthConnected || settings.stravaAthlete != null;
  const lastSync = Math.max(settings.healthSyncedAt ?? 0, settings.stravaSyncedAt ?? 0) || null;
  // re-render "Updated 3 min ago" once a minute
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  /** Sync every connected source; quiet syncs only speak up if something changed or failed. */
  const runSync = useCallback(
    async (quiet: boolean) => {
      setSyncing(true);
      try {
        const { summary, errors } = await syncAll(store, settings);
        if (errors.length) toast(errors[0]);
        else if (!quiet || summary.added || summary.merged) toast(describeSync(summary));
      } finally {
        setSyncing(false);
      }
    },
    [store, settings, toast],
  );

  async function refresh() {
    setRefreshing(true);
    try {
      await runSync(false);
    } finally {
      setRefreshing(false);
    }
  }

  // sync quietly once when the app opens, if it's been a while
  const autoSynced = useRef(false);
  useEffect(() => {
    if (autoSynced.current || !anyConnected) return;
    autoSynced.current = true;
    const last = Math.min(settings.healthSyncedAt ?? 0, settings.stravaSyncedAt ?? Infinity);
    if (Date.now() - last > 15 * 60_000) setTimeout(() => runSync(true), 0);
  }, [anyConnected, settings, runSync]);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () =>
            activities.length > 0 ? (
              <View style={{ marginRight: 8 }}>
                <IconButton icon={Plus} label="Add an activity" variant="plain" onPress={() => setAddOpen(true)} />
              </View>
            ) : null,
        }}
      />
      {loading ? (
        <SkeletonList />
      ) : activities.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            icon={FileUp}
            title="Bring in a run to get started"
            body={emptyBody()}
            actions={<AddButtons add={add} />}
          />
        </View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => <ActivityRow activity={item} units={settings.units} />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={{ paddingBottom: 8 }}
          ListHeaderComponent={
            anyConnected ? (
              <SyncLine syncing={syncing || refreshing} lastSync={lastSync} onHelp={() => setHelpOpen(true)} />
            ) : undefined
          }
          refreshControl={
            anyConnected ? <RefreshControl refreshing={refreshing} onRefresh={() => refresh()} tintColor={colors.text} /> : undefined
          }
        />
      )}
      <MissingWorkoutSheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        health={settings.healthConnected}
        strava={settings.stravaAthlete != null}
        onSync={() => {
          setHelpOpen(false);
          refresh();
        }}
        onImport={() => {
          setHelpOpen(false);
          add.importFile();
        }}
      />
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Add an activity">
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <AddButtons add={add} />
        </View>
      </Sheet>
    </>
  );
}

function SyncLine({ syncing, lastSync, onHelp }: { syncing: boolean; lastSync: number | null; onHelp: () => void }) {
  return (
    <View style={styles.syncLine} accessibilityLiveRegion="polite">
      <Text variant="footnote" color="textMuted">
        {syncing ? 'Syncing…' : lastSync ? `Updated ${timeAgo(lastSync)}` : 'Not synced yet'}
      </Text>
      <Pressable onPress={onHelp} accessibilityRole="button" hitSlop={10}>
        <Text variant="footnote" weight="600" color="accent">
          Missing a workout?
        </Text>
      </Pressable>
    </View>
  );
}

/** What to check when a just-finished workout isn't in the list yet. */
function MissingWorkoutSheet({
  open,
  onClose,
  health,
  strava,
  onSync,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  health: boolean;
  strava: boolean;
  onSync: () => void;
  onImport: () => void;
}) {
  const tips = [
    ...(health
      ? [
          'Your watch app saves to Apple Health a minute or two after you stop. Give it a moment, then sync.',
          'In the Health app: your profile picture → Apps → Mileprint. Allow Workouts, Workout Routes and Heart Rate.',
        ]
      : []),
    ...(strava ? ['Check the activity has finished uploading to Strava. Mileprint reads it straight after.'] : []),
    'Recorded on something else? Export a GPX, TCX or FIT file from its app and open it here.',
  ];
  return (
    <Sheet open={open} onClose={onClose} title="Missing a workout?">
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        {tips.map((t) => (
          <View key={t} style={{ flexDirection: 'row', gap: 10 }}>
            <Text variant="sm" color="accent">
              •
            </Text>
            <Text variant="sm" style={{ flex: 1 }}>
              {t}
            </Text>
          </View>
        ))}
        <Button label="Sync now" icon={RefreshCw} fullWidth onPress={onSync} />
        <Button label="Import a file instead" icon={FileUp} variant="secondary" fullWidth onPress={onImport} />
      </View>
    </Sheet>
  );
}

function emptyBody(): string {
  const sources = [healthAvailable() && 'Apple Health', stravaConfigured() && 'Strava'].filter(Boolean);
  const sync = sources.length ? `Sync from ${sources.join(' or ')}, open` : 'Open';
  return `${sync} a GPX, TCX or FIT file from your watch, or type one in. No account needed.`;
}

function useAddActions(units: Units, done: () => void) {
  const store = useStore();
  const toast = useToast();
  const [importing, setImporting] = useState(false);

  return {
    importing,
    async importFile() {
      setImporting(true);
      try {
        const results = await pickAndImport(store);
        if (!results) return;
        done();
        const [only] = results;
        if (results.length === 1 && only.status === 'failed') {
          toast(only.reason);
        } else if (results.length === 1 && only.status !== 'failed') {
          // one activity: go straight to making a story with it
          if (only.status === 'duplicate') toast('Already imported. Opening it.');
          router.push({ pathname: '/edit/[activityId]', params: { activityId: only.activity.id } });
        } else {
          toast(summarise(results));
        }
      } finally {
        setImporting(false);
      }
    },
    manual() {
      done();
      router.push('/activities/new');
    },
  };
}

function AddButtons({ add }: { add: ReturnType<typeof useAddActions> }) {
  const health = useHealth();
  const strava = useStrava();
  const toast = useToast();
  const report = (e: unknown) => {
    const msg = syncErrorMessage(e);
    if (msg) toast(msg);
  };
  const showHealth = health.available && !health.connected;
  const showStrava = strava.configured && !strava.connected;
  return (
    <>
      {showHealth && (
        <Button
          label="Connect Apple Health"
          icon={HeartPulse}
          fullWidth
          loading={health.busy === 'connect'}
          onPress={() => health.connect().then((r) => toast(describeSync(r)), report)}
        />
      )}
      {showStrava && (
        <Button
          label="Connect to Strava"
          icon={StravaIcon}
          variant={showHealth ? 'secondary' : 'primary'}
          fullWidth
          loading={strava.busy === 'connect'}
          onPress={() => strava.connect().then((r) => toast(describeSync(r)), report)}
        />
      )}
      <Button
        label="Import a GPX, TCX or FIT file"
        icon={FileUp}
        variant={showHealth || showStrava ? 'secondary' : 'primary'}
        fullWidth
        loading={add.importing}
        onPress={add.importFile}
      />
      <Button label="Add one by hand" icon={PenLine} variant={showHealth || showStrava ? 'ghost' : 'secondary'} fullWidth onPress={add.manual} />
    </>
  );
}

function ActivityRow({ activity: a, units }: { activity: Activity; units: Units }) {
  const dist = formatDistance(a.distanceM, units);
  const trailing = dist ? `${dist} ${unitLabel.distance(units)}` : (formatDuration(a.movingTimeS) ?? undefined);
  const day = formatDay(a);
  return (
    <ListRow
      icon={activityIcon(a.type)}
      title={a.title}
      subtitle={`${day} · ${SOURCE_LABEL[a.source]}`}
      trailing={trailing}
      accessibilityLabel={`${a.title}, ${trailing ?? ''}, ${day}. Opens the story editor.`}
      onPress={() => router.push({ pathname: '/edit/[activityId]', params: { activityId: a.id } })}
    />
  );
}

function SkeletonList() {
  return (
    <View style={{ paddingVertical: 8 }} accessibilityLabel="Loading activities" accessible>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.skelRow}>
          <View style={[styles.skel, { width: 40, height: 40, borderRadius: radius.pill }]} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={[styles.skel, { width: '60%', height: 14 }]} />
            <View style={[styles.skel, { width: '40%', height: 10 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  syncLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  center: { flex: 1, justifyContent: 'center' },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 68 },
  skelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 64 },
  skel: { backgroundColor: colors.surfaceRaised, borderRadius: radius.sm },
});
