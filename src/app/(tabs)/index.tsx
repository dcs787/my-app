import { router, Stack } from 'expo-router';
import { FileUp, HeartPulse, PenLine, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { activityIcon } from '@/components/activityIcon';
import { useActivities, useSettings, useStore } from '@/data';
import { formatDistance, formatDuration, formatDay, SOURCE_LABEL, unitLabel } from '@/domain/format';
import type { Activity, Units } from '@/domain/types';
import { pickAndImport, summarise } from '@/features/importFiles';
import { colors, radius } from '@/theme';
import { Button, EmptyState, IconButton, ListRow, Sheet, useToast } from '@/ui';

export default function ActivitiesScreen() {
  const { data: activities, loading } = useActivities();
  const { data: settings } = useSettings();
  const [addOpen, setAddOpen] = useState(false);
  const add = useAddActions(settings.units, () => setAddOpen(false));

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
            title="Bring in your first workout"
            body="Open a GPX, TCX or FIT file from your watch or app, or type one in."
            actions={<AddButtons add={add} />}
          />
        </View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => <ActivityRow activity={item} units={settings.units} />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Add an activity">
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <AddButtons add={add} />
        </View>
      </Sheet>
    </>
  );
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
  return (
    <>
      <Button label="Import a GPX, TCX or FIT file" icon={FileUp} fullWidth loading={add.importing} onPress={add.importFile} />
      <Button label="Add one by hand" icon={PenLine} variant="secondary" fullWidth onPress={add.manual} />
      <Button label="Apple Health (coming soon)" icon={HeartPulse} variant="ghost" fullWidth disabled />
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
  center: { flex: 1, justifyContent: 'center' },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 68 },
  skelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 64 },
  skel: { backgroundColor: colors.surfaceRaised, borderRadius: radius.sm },
});
