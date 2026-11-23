import { Check, Type } from '@/ui/icons';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useActivities, useActivity, useSettings, useStore } from '@/data';
import { FONT_IDS, type FontId } from '@/domain/composition';
import { computeTotals, type Period, type Totals } from '@/domain/totals';
import { colors } from '@/theme';
import { Chip, EmptyState, SegmentedTabs, Swatches, Text, useToast } from '@/ui';

import { PhotosPermissionError, savePngToPhotos } from './exportStory';
import { FONT_NAMES, TemplateFontsProvider, useTemplateFonts } from './fonts';
import { copyStickerToClipboard, renderStickerBase64 } from './stickerExport';
import { TemplateGrid } from './TemplatePreview';
import { TEMPLATES, templateById } from './templates';

/**
 * S06: tap a sticker to copy it, then paste it over a photo or video in
 * Instagram (or anywhere). Press and hold to save it to Photos.
 */
export default function StickersScreen({ activityId }: { activityId: string }) {
  return (
    <TemplateFontsProvider>
      <Stickers activityId={activityId} />
    </TemplateFontsProvider>
  );
}

export function StickersLoading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.text} />
    </View>
  );
}

function Stickers({ activityId }: { activityId: string }) {
  const store = useStore();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const fonts = useTemplateFonts();
  const { data: activity, loading } = useActivity(activityId);
  const { data: all } = useActivities();
  const { data: settings } = useSettings();
  const [tab, setTab] = useState<'activity' | 'totals'>('activity');
  const [colour, setColour] = useState(settings.lastColour ?? '#FFFFFF');
  const [font, setFont] = useState<FontId>((FONT_IDS as string[]).includes(settings.lastFont ?? '') ? (settings.lastFont as FontId) : 'inter');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totals = useMemo<Record<Period, Totals> | undefined>(
    () =>
      activity
        ? { week: computeTotals(all, activity, 'week'), month: computeTotals(all, activity, 'month'), year: computeTotals(all, activity, 'year') }
        : undefined,
    [all, activity],
  );
  const list = useMemo(() => TEMPLATES.filter((t) => t.category === tab), [tab]);

  if (loading || !fonts) return <StickersLoading />;
  if (!activity) return <EmptyState icon={Type} title="This activity is gone" body="It may have been deleted." />;

  async function render(id: string) {
    const t = templateById(id)!;
    return renderStickerBase64(t, { activity: activity!, units: settings.units, totals }, fonts![font], colour);
  }

  async function copy(id: string) {
    try {
      await copyStickerToClipboard(await render(id));
      setCopiedId(id);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopiedId(null), 1500);
      toast('Copied. Paste it into your story.', Check);
      store.setSettings({ lastColour: colour, lastFont: font }).catch(() => {});
    } catch {
      toast('Couldn’t copy the sticker');
    }
  }

  async function save(id: string) {
    try {
      await savePngToPhotos(await render(id));
      toast('Saved to Photos');
    } catch (e) {
      toast(e instanceof PhotosPermissionError ? e.message : 'Couldn’t save the sticker');
    }
  }

  const nextFont = FONT_IDS[(FONT_IDS.indexOf(font) + 1) % FONT_IDS.length];
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.controls}>
        <Text variant="footnote" color="textMuted">
          Tap to copy, then paste into your story. Press and hold to save.
        </Text>
        <Swatches value={colour} onChange={setColour} />
        <View style={{ flexDirection: 'row' }}>
          <Chip label={`Font: ${FONT_NAMES[font]}`} icon={Type} onPress={() => setFont(nextFont)} />
        </View>
        <SegmentedTabs
          accessibilityLabel="Sticker type"
          items={[
            { key: 'activity', label: 'Activity' },
            { key: 'totals', label: 'Totals' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>
      <View style={{ alignItems: 'center', paddingTop: 16 }}>
        <TemplateGrid
          templates={list}
          activity={activity}
          units={settings.units}
          totals={totals}
          fonts={fonts[font]}
          colour={colour}
          width={Math.min(width, 560) - 32}
          onPick={copy}
          onLongPress={save}
          copiedId={copiedId}
          hint="Copy"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  controls: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
});
