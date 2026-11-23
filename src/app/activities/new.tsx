import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettings, useStore } from '@/data';
import { typeLabel, unitLabel } from '@/domain/format';
import { activityFromManual, type ManualErrors } from '@/domain/import';
import type { ActivityType } from '@/domain/types';
import { Button, Chip, Text, TextField, useToast } from '@/ui';

const TYPES: ActivityType[] = ['run', 'trail_run', 'walk', 'hike', 'ride', 'swim', 'skate', 'ski', 'row', 'climb', 'yoga', 'elliptical', 'workout'];

const pad = (n: number) => String(n).padStart(2, '0');
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Parse "2026-11-18" + "07:30" in the device's time zone. */
function parseWhen(day: string, time: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day.trim());
  const t = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m || !t || Number(t[1]) > 23 || Number(t[2]) > 59) return NaN;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(t[1]), Number(t[2]));
  return d.getMonth() === Number(m[2]) - 1 ? d.getTime() : NaN; // rejects 2026-02-31
}

export default function NewActivityScreen() {
  const store = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { data: settings } = useSettings();
  const units = settings.units;

  const today = useMemo(() => new Date(), []);
  const [type, setType] = useState<ActivityType>('run');
  const [title, setTitle] = useState('');
  const [day, setDay] = useState(isoDay(today));
  const [time, setTime] = useState(`${pad(today.getHours())}:${pad(today.getMinutes())}`);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [elevation, setElevation] = useState('');
  const [avgHr, setAvgHr] = useState('');
  const [calories, setCalories] = useState('');
  const [errors, setErrors] = useState<ManualErrors>({});
  const [saving, setSaving] = useState(false);

  const yesterday = isoDay(new Date(today.getTime() - 86_400_000));

  async function save() {
    const startedAt = parseWhen(day, time);
    const res = activityFromManual(
      { type, title, startedAt, distance, duration, elevation, avgHr, calories },
      units,
    );
    if (!res.ok) {
      setErrors(Number.isNaN(startedAt) ? { ...res.errors, startedAt: 'Use a date like 2026-11-18 and a time like 07:30' } : res.errors);
      return;
    }
    setSaving(true);
    try {
      const { activity } = await store.insertActivity(res.activity);
      toast('Activity added');
      router.replace({ pathname: '/edit/[activityId]', params: { activityId: activity.id } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 24 }]}>
        <View style={{ gap: 8 }}>
          <Text variant="footnote" weight="500">
            Type
          </Text>
          <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Activity type">
            {TYPES.map((t) => (
              <Chip key={t} label={typeLabel(t)} variant="toggle" selected={type === t} onPress={() => setType(t)} />
            ))}
          </View>
        </View>

        <TextField label="Title (optional)" value={title} onChangeText={setTitle} placeholder="Morning run" maxLength={120} returnKeyType="next" />

        <View style={{ gap: 8 }}>
          <View style={styles.row}>
            <View style={{ flex: 3 }}>
              <TextField label="Date" value={day} onChangeText={setDay} placeholder="2026-11-18" autoCorrect={false} error={errors.startedAt} />
            </View>
            <View style={{ flex: 2 }}>
              <TextField label="Start time" value={time} onChangeText={setTime} placeholder="07:30" keyboardType="numbers-and-punctuation" />
            </View>
          </View>
          <View style={styles.chips}>
            <Chip label="Today" variant="toggle" selected={day === isoDay(today)} onPress={() => setDay(isoDay(today))} />
            <Chip label="Yesterday" variant="toggle" selected={day === yesterday} onPress={() => setDay(yesterday)} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <TextField
              label={`Distance (${unitLabel.distance(units)})`}
              value={distance}
              onChangeText={setDistance}
              placeholder="6.2"
              keyboardType="decimal-pad"
              error={errors.distance}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Time"
              value={duration}
              onChangeText={setDuration}
              placeholder="48:10"
              keyboardType="numbers-and-punctuation"
              helper={errors.duration ? undefined : 'mm:ss or h:mm:ss'}
              error={errors.duration}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <TextField
              label={`Climb (${unitLabel.elevation(units)})`}
              value={elevation}
              onChangeText={setElevation}
              placeholder="Optional"
              keyboardType="number-pad"
              error={errors.elevation}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Avg heart rate" value={avgHr} onChangeText={setAvgHr} placeholder="Optional" keyboardType="number-pad" error={errors.avgHr} />
          </View>
        </View>
        <TextField label="Calories" value={calories} onChangeText={setCalories} placeholder="Optional" keyboardType="number-pad" error={errors.calories} />

        <Button label="Save and make a story" size="lg" fullWidth loading={saving} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  form: { padding: 16, gap: 20, maxWidth: 560, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
