import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Copy, Sparkles, Trash } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { confirm } from '@/components/confirm';
import { RoutePreview } from '@/components/RoutePreview';
import { useActivity, useSettings, useStore } from '@/data';
import {
  formatDay,
  formatDistance,
  formatDuration,
  formatElevation,
  formatPace,
  formatSpeed,
  hasLaps,
  lapsNote,
  SOURCE_LABEL,
  splitsNote,
  typeLabel,
  unitLabel,
  usesSpeed,
} from '@/domain/format';
import { ACTIVITY_TYPES, type Activity, type Lap, type Split, type Units } from '@/domain/types';
import { useStravaDetails } from '@/features/stravaDetails';
import { colors, radius } from '@/theme';
import { Button, Chip, EmptyState, SegmentedTabs, StatBlock, Text, TextField, useToast } from '@/ui';

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: activity, loading } = useActivity(id);
  const { data: settings } = useSettings();
  useStravaDetails(activity);

  if (loading) return null;
  if (!activity) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <EmptyState icon={Trash} title="This activity is gone" body="It may have been deleted." actions={<Button label="Back to activities" fullWidth onPress={() => router.replace('/')} />} />
      </View>
    );
  }
  return <Detail key={activity.id} activity={activity} units={settings.units} />;
}

function Detail({ activity: a, units }: { activity: Activity; units: Units }) {
  const store = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [title, setTitle] = useState(a.title);
  const mapW = Math.min(width, 560) - 32;

  const speed = usesSpeed(a.type);
  const splits = a.splits.filter((s) => s.unit === units);
  const laps = hasLaps(a) ? a.laps : [];
  const [view, setView] = useState<'laps' | 'splits'>('laps');
  const showing = laps.length && (view === 'laps' || !splits.length) ? 'laps' : 'splits';

  async function saveTitle() {
    const t = title.trim();
    if (!t || t === a.title) return setTitle(a.title);
    await store.updateActivity(a.id, { title: t.slice(0, 120) });
    toast('Renamed');
  }

  async function remove() {
    const ok = await confirm({ title: 'Delete this activity?', message: 'Its story designs are deleted too. This can’t be undone.', confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    await store.deleteActivity(a.id);
    toast('Activity deleted');
    router.dismissTo('/');
  }

  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + 24 }]}>
      <Stack.Screen options={{ title: typeLabel(a.type) }} />
      <TextField label="Title" value={title} onChangeText={setTitle} onBlur={saveTitle} onSubmitEditing={saveTitle} returnKeyType="done" maxLength={120} />
      <Text variant="footnote" color="textMuted">
        {formatDay(a)} · {SOURCE_LABEL[a.source]}
      </Text>

      {a.routePolyline ? (
        <View style={[styles.map, { height: mapW * 0.6 }]}>
          <RoutePreview polyline={a.routePolyline} width={mapW - 24} height={mapW * 0.6 - 24} />
        </View>
      ) : null}

      <StatBlock
        hero
        stats={[
          { label: 'Distance', value: formatDistance(a.distanceM, units), unit: unitLabel.distance(units) },
          speed
            ? { label: 'Speed', value: formatSpeed(a.distanceM, a.movingTimeS, units), unit: unitLabel.speed(units) }
            : { label: 'Pace', value: formatPace(a.distanceM, a.movingTimeS, units), unit: unitLabel.pace(units) },
          { label: 'Moving time', value: formatDuration(a.movingTimeS) },
          { label: 'Climb', value: formatElevation(a.elevationGainM, units), unit: unitLabel.elevation(units) },
          { label: 'Avg HR', value: a.avgHr != null ? String(a.avgHr) : null, unit: 'bpm' },
          { label: 'Calories', value: a.calories != null ? String(a.calories) : null },
        ]}
      />

      {(laps.length > 0 || splits.length > 0) && (
        <View style={{ gap: 6 }}>
          {laps.length > 0 && splits.length > 0 ? (
            <SegmentedTabs
              accessibilityLabel="Laps or splits"
              items={[
                { key: 'laps', label: `Laps (${laps.length})` },
                { key: 'splits', label: 'Splits' },
              ]}
              value={showing}
              onChange={setView}
            />
          ) : (
            <Text variant="footnote" color="textMuted" uppercase>
              {showing === 'laps' ? 'Laps' : 'Splits'}
            </Text>
          )}
          {showing === 'laps'
            ? laps.map((l) => <LapRow key={l.index} lap={l} units={units} speed={speed} />)
            : splits.map((s) => <SplitRow key={s.index} split={s} units={units} speed={speed} />)}
          <Text variant="footnote" color="textMuted">
            {showing === 'laps' ? lapsNote(a) : splitsNote(a)}
          </Text>
        </View>
      )}

      <View style={{ gap: 8 }}>
        <Text variant="footnote" color="textMuted" uppercase>
          Type
        </Text>
        <View style={styles.chips}>
          {ACTIVITY_TYPES.map((t) => (
            <Chip key={t} label={typeLabel(t)} variant="toggle" selected={a.type === t} onPress={() => store.updateActivity(a.id, { type: t })} />
          ))}
        </View>
      </View>

      <Button label="Make a story" icon={Sparkles} size="lg" fullWidth onPress={() => router.push({ pathname: '/edit/[activityId]', params: { activityId: a.id } })} />
      <Button
        label="Copy stickers"
        icon={Copy}
        variant="secondary"
        fullWidth
        onPress={() => router.push({ pathname: '/stickers/[activityId]', params: { activityId: a.id } })}
      />
      <Button label="Delete activity" icon={Trash} variant="danger" fullWidth onPress={remove} />
    </ScrollView>
  );
}

const paceText = (distanceM: number, timeS: number, units: Units, speed: boolean) =>
  speed ? `${formatSpeed(distanceM, timeS, units)} ${unitLabel.speed(units)}` : `${formatPace(distanceM, timeS, units)} ${unitLabel.pace(units)}`;

function SplitRow({ split: s, units, speed }: { split: Split; units: Units; speed: boolean }) {
  return (
    <View style={styles.split}>
      <Text variant="sm" color="textMuted" style={{ width: 40 }}>
        {s.distanceM < (units === 'mi' ? 1609 : 1000) ? `${formatDistance(s.distanceM, units)}` : s.index}
      </Text>
      <Text variant="sm" weight="600" style={{ flex: 1 }}>
        {paceText(s.distanceM, s.timeS, units, speed)}
      </Text>
      {s.elevationDeltaM != null && (
        <Text variant="sm" color="textMuted">
          {s.elevationDeltaM >= 0 ? '+' : ''}
          {formatElevation(s.elevationDeltaM, units)} {unitLabel.elevation(units)}
        </Text>
      )}
    </View>
  );
}

/** Lap number, pace, then the lap's own distance and time (laps vary in length). */
function LapRow({ lap: l, units, speed }: { lap: Lap; units: Units; speed: boolean }) {
  return (
    <View style={styles.split} accessible accessibilityLabel={`Lap ${l.index}: ${formatDistance(l.distanceM, units)} ${unitLabel.distance(units)} in ${formatDuration(l.timeS)}`}>
      <Text variant="sm" color="textMuted" style={{ width: 40 }}>
        {l.index}
      </Text>
      <Text variant="sm" weight="600" style={{ flex: 1 }}>
        {l.distanceM > 0 ? paceText(l.distanceM, l.timeS, units, speed) : formatDuration(l.timeS)}
      </Text>
      <Text variant="sm" color="textMuted" style={{ fontVariant: ['tabular-nums'] }}>
        {l.distanceM > 0 ? `${formatDistance(l.distanceM, units)} ${unitLabel.distance(units)} · ` : ''}
        {formatDuration(l.timeS)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  map: { backgroundColor: colors.surface, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  split: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
