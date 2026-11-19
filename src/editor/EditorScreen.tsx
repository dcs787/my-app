import { Canvas, Group, useImage } from '@shopify/react-native-skia';
import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { ArrowUpToLine, Copy, Download, ImagePlus, Info, Layers, Palette, PenLine, Plus, Send, Share, Trash, Type, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useRotationGesture, useSimultaneousGestures } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useActivities, useActivity, useSettings, useStore } from '@/data';
import { CANVAS, FONT_IDS, type Background, type Composition } from '@/domain/composition';
import { computeTotals, type Period, type Totals } from '@/domain/totals';
import type { Activity, Units } from '@/domain/types';
import {
  addElement,
  bringToFront,
  moveElement,
  clamp,
  DEFAULT_STYLE,
  defaultComposition,
  elementAt,
  removeElement,
  updateElement,
  type Style,
} from './compose';
import { PhotosPermissionError, renderStory, saveToPhotos, shareStory } from './exportStory';
import { canShareToInstagram, shareToInstagramStory } from './instagram';
import { FONT_NAMES, TemplateFontsProvider, useTemplateFonts, type TemplateFonts } from './fonts';
import { pickBackgroundPhoto } from './pickPhoto';
import { Scene } from './Scene';
import { LayersList } from './LayersList';
import { TemplateGrid } from './TemplatePreview';
import { TEMPLATES, TEXT_TEMPLATE_ID } from './templates';
import { colors, motion, radius } from '@/theme';
import { Button, Chip, EmptyState, IconButton, SegmentedTabs, Sheet, Swatches, Text, TextField, useToast } from '@/ui';

type Draft = Omit<Composition, 'createdAt' | 'updatedAt'>;

/**
 * The story editor. Lives outside src/app so web can load it lazily, after
 * Skia's WebAssembly runtime is ready (see EditorHost.web.tsx).
 */
export default function EditorScreen({ activityId }: { activityId: string }) {
  return (
    <TemplateFontsProvider>
      <EditorLoader activityId={activityId} />
    </TemplateFontsProvider>
  );
}

export function EditorLoading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.text} />
    </View>
  );
}

function EditorLoader({ activityId }: { activityId: string }) {
  const store = useStore();
  const { data: activity, loading: loadingActivity } = useActivity(activityId);
  const { data: settings, loading: loadingSettings } = useSettings();
  const fonts = useTemplateFonts();
  const [draft, setDraft] = useState<Draft | null>(null);

  // load the last design for this activity, or lay out a fresh one
  useEffect(() => {
    if (!activity || loadingSettings || draft) return;
    let alive = true;
    store.latestComposition(activity.id).then((saved) => {
      if (!alive) return;
      const style: Style = {
        colour: settings.lastColour ?? DEFAULT_STYLE.colour,
        font: (FONT_IDS as string[]).includes(settings.lastFont ?? '') ? (settings.lastFont as Style['font']) : DEFAULT_STYLE.font,
      };
      setDraft(saved ?? defaultComposition(activity, randomUUID, style));
    });
    return () => {
      alive = false;
    };
  }, [activity, loadingSettings, settings, store, draft]);

  if (!loadingActivity && !activity) {
    return (
      <View style={styles.loading}>
        <EmptyState icon={X} title="This activity is gone" actions={<Button label="Close" fullWidth onPress={() => router.back()} />} />
      </View>
    );
  }
  if (!activity || !fonts || !draft) return <EditorLoading />;
  return <Editor activity={activity} units={settings.units} fonts={fonts} initial={draft} />;
}

type Panel = 'templates' | 'background' | 'colour' | 'text' | 'layers' | null;

function Editor({ activity, units, fonts, initial }: { activity: Activity; units: Units; fonts: TemplateFonts; initial: Draft }) {
  const store = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [doc, setDoc] = useState<Draft>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [draftText, setDraftText] = useState('');
  const [busy, setBusy] = useState<'save' | 'share' | 'instagram' | null>(null);
  const [instagram, setInstagram] = useState(false);
  useEffect(() => {
    canShareToInstagram().then(setInstagram, () => setInstagram(false));
  }, []);
  const [area, setArea] = useState({ w: 0, h: 0 });

  const selected = doc.elements.find((e) => e.id === selectedId) ?? null;
  const { data: allActivities } = useActivities();
  const totals = useMemo<Record<Period, Totals>>(
    () => ({
      week: computeTotals(allActivities, activity, 'week'),
      month: computeTotals(allActivities, activity, 'month'),
      year: computeTotals(allActivities, activity, 'year'),
    }),
    [allActivities, activity],
  );
  const photo = useImage(doc.background.kind === 'photo' ? doc.background.uri : null);
  const scale = area.w && area.h ? Math.min(area.w / CANVAS.w, area.h / CANVAS.h) : 0;
  const style: Style = selected ? { colour: selected.colour, font: selected.font } : { colour: '#FFFFFF', font: initial.elements[0]?.font ?? 'inter' };

  // autosave a moment after the last change
  useEffect(() => {
    const t = setTimeout(() => {
      store.saveComposition(doc).catch(() => toast('Couldn’t save your design'));
    }, 400);
    return () => clearTimeout(t);
  }, [doc, store, toast]);

  // ---- gestures (canvas coordinates = view coordinates / scale)
  const docRef = useRef(doc);
  const selRef = useRef(selectedId);
  useEffect(() => {
    docRef.current = doc;
    selRef.current = selectedId;
  });
  const drag = useRef<{ id: string | null; moved: boolean }>({ id: null, moved: false });

  const pan = usePanGesture({
    runOnJS: true,
    maxPointers: 1,
    onBegin: (e) => {
      const hit = elementAt(docRef.current.elements, e.x / scale, e.y / scale);
      drag.current = { id: hit?.id ?? null, moved: false };
      if (hit) setSelectedId(hit.id);
    },
    onUpdate: (e) => {
      const id = drag.current.id;
      if (!id) return;
      drag.current.moved = true;
      setDoc((d) => {
        const el = d.elements.find((x) => x.id === id);
        if (!el) return d;
        return updateElement(d, id, {
          x: clamp(el.x + e.changeX / scale, 0, CANVAS.w),
          y: clamp(el.y + e.changeY / scale, 0, CANVAS.h),
        });
      });
    },
    onFinalize: () => {
      if (!drag.current.id && !drag.current.moved) setSelectedId(null); // tap on empty canvas
      drag.current = { id: null, moved: false };
    },
  });
  const pinch = usePinchGesture({
    runOnJS: true,
    onUpdate: (e) => {
      const id = selRef.current;
      if (id) setDoc((d) => updateElement(d, id, { scale: (d.elements.find((x) => x.id === id)?.scale ?? 1) * e.scaleChange }));
    },
  });
  const rotate = useRotationGesture({
    runOnJS: true,
    onUpdate: (e) => {
      const id = selRef.current;
      if (id) setDoc((d) => updateElement(d, id, { rotation: (d.elements.find((x) => x.id === id)?.rotation ?? 0) + e.rotationChange }));
    },
  });
  const gestures = useSimultaneousGestures(pan, pinch, rotate);

  // ---- actions
  const rememberStyle = useCallback((s: Partial<Style>) => {
    store.setSettings({ ...(s.colour ? { lastColour: s.colour } : {}), ...(s.font ? { lastFont: s.font } : {}) }).catch(() => {});
  }, [store]);

  function add(templateId: string) {
    const r = addElement(doc, templateId, randomUUID, style, activity);
    if (!r.element) return;
    setDoc(r.composition);
    setSelectedId(r.element.id);
    setPanel(null);
  }

  /** Add an empty text sticker and open the keyboard for it. */
  function addText() {
    const r = addElement(doc, TEXT_TEMPLATE_ID, randomUUID, style, activity);
    if (!r.element) return;
    setDoc(r.composition);
    setSelectedId(r.element.id);
    setDraftText('');
    // iOS shows one modal at a time: let the sticker sheet finish closing first
    setPanel(null);
    setTimeout(() => setPanel('text'), motion.sheet + 50);
  }

  function editText() {
    if (!selected) return;
    setDraftText(selected.text ?? '');
    setPanel('text');
  }

  function finishText() {
    if (!selected) return setPanel(null);
    const words = draftText.trim().slice(0, 80);
    if (words) setDoc((d) => updateElement(d, selected.id, { text: words }));
    else if (!selected.text) {
      // left empty on a new sticker: don't keep a placeholder around
      setDoc((d) => removeElement(d, selected.id));
      setSelectedId(null);
    }
    setPanel(null);
  }

  function cycleFont() {
    if (!selected) return;
    const next = FONT_IDS[(FONT_IDS.indexOf(selected.font) + 1) % FONT_IDS.length];
    setDoc((d) => updateElement(d, selected.id, { font: next }));
    rememberStyle({ font: next });
    toast(`Font: ${FONT_NAMES[next]}`, Type);
  }

  function setColour(colour: string) {
    if (selected) setDoc((d) => updateElement(d, selected.id, { colour }));
    rememberStyle({ colour });
  }

  function setBackground(background: Background) {
    setDoc((d) => ({ ...d, background }));
  }

  async function choosePhoto() {
    try {
      const bg = await pickBackgroundPhoto();
      if (bg) {
        setBackground(bg);
        setPanel(null);
      }
    } catch {
      toast('That photo couldn’t be opened');
    }
  }

  async function exportAs(kind: 'save' | 'share' | 'instagram') {
    setSelectedId(null);
    setBusy(kind);
    try {
      const uri = await renderStory({ composition: doc, activity, units, fonts, photo, totals });
      if (kind === 'save') {
        await saveToPhotos(uri);
        toast('Saved to Photos', Download);
      } else if (kind === 'instagram') {
        try {
          await shareToInstagramStory(uri);
        } catch {
          await shareStory(uri); // Instagram refused or isn't there: the share sheet still works
        }
      } else {
        await shareStory(uri);
      }
    } catch (e) {
      toast(e instanceof PhotosPermissionError ? e.message : kind === 'save' ? 'Couldn’t save. Try again.' : 'Couldn’t share. Try again.');
    } finally {
      setBusy(null);
    }
  }

  const onArea = (e: LayoutChangeEvent) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.topBar}>
        <IconButton icon={X} label="Close editor" variant="solid" onPress={() => router.back()} />
        <Text variant="sm" weight="600" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
          {activity.title}
        </Text>
        <IconButton
          icon={Copy}
          label="Copy stickers"
          variant="solid"
          onPress={() => router.push({ pathname: '/stickers/[activityId]', params: { activityId: activity.id } })}
        />
        <IconButton icon={Layers} label="Layers" variant="solid" onPress={() => setPanel('layers')} />
        <IconButton icon={Info} label="Activity details" variant="solid" onPress={() => router.push({ pathname: '/activities/[id]', params: { id: activity.id } })} />
      </View>

      <View style={styles.stage} onLayout={onArea}>
        {scale > 0 && (
          <GestureDetector gesture={gestures}>
            <View
              style={[styles.canvasWrap, { width: CANVAS.w * scale, height: CANVAS.h * scale }]}
              accessible
              accessibilityLabel={`Story canvas with ${doc.elements.length} stickers. Drag to move, pinch to resize, twist to rotate.`}
              testID="story-canvas">
              <Canvas style={{ width: CANVAS.w * scale, height: CANVAS.h * scale }}>
                <Group transform={[{ scale }]}>
                  <Scene composition={doc} activity={activity} units={units} fonts={fonts} photo={photo} selectedId={selectedId} totals={totals} />
                </Group>
              </Canvas>
            </View>
          </GestureDetector>
        )}
        {selected && (
          <View style={styles.rail}>
            {selected.templateId === TEXT_TEMPLATE_ID && <IconButton icon={PenLine} label="Edit text" onPress={editText} />}
            <IconButton icon={Type} label={`Font: ${FONT_NAMES[selected.font]}. Change font`} onPress={cycleFont} />
            <IconButton icon={Palette} label="Colour" onPress={() => setPanel('colour')} />
            <IconButton
              icon={ArrowUpToLine}
              label="Bring to front"
              onPress={() => setDoc((d) => bringToFront(d, selected.id))}
            />
            <IconButton
              icon={Trash}
              label="Delete sticker"
              onPress={() => {
                setDoc((d) => removeElement(d, selected.id));
                setSelectedId(null);
              }}
            />
          </View>
        )}
      </View>

      <View style={styles.bottomBar}>
        <IconButton icon={Plus} label="Add a sticker" variant="solid" onPress={() => setPanel('templates')} />
        <IconButton icon={ImagePlus} label="Background" variant="solid" onPress={() => setPanel('background')} />
        <View style={{ flex: 1 }} />
        {instagram ? (
          <>
            <IconButton icon={Download} label="Save to Photos" variant="solid" disabled={!!busy} onPress={() => exportAs('save')} />
            <IconButton icon={Share} label="Share" variant="solid" disabled={!!busy} onPress={() => exportAs('share')} />
            <Button label="Instagram" icon={Send} loading={busy === 'instagram'} disabled={!!busy} onPress={() => exportAs('instagram')} />
          </>
        ) : (
          <>
            <Button label="Save" icon={Download} variant="secondary" loading={busy === 'save'} disabled={!!busy} onPress={() => exportAs('save')} />
            <Button label="Share" icon={Share} loading={busy === 'share'} disabled={!!busy} onPress={() => exportAs('share')} />
          </>
        )}
      </View>

      <TemplateSheet open={panel === 'templates'} onClose={() => setPanel(null)} onPick={add} onAddText={addText} activity={activity} units={units} fonts={fonts} style={style} totals={totals} />

      <Sheet open={panel === 'background'} onClose={() => setPanel(null)} title="Background">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}>
          <Button label="Choose a photo" icon={ImagePlus} fullWidth onPress={choosePhoto} />
          <Text variant="footnote" color="textMuted" uppercase>
            Or a colour
          </Text>
          <View style={styles.bgGrid}>
            {BACKGROUNDS.map((bg) => (
              <Pressable
                key={bg.name}
                accessibilityRole="button"
                accessibilityLabel={`${bg.name} background`}
                onPress={() => {
                  setBackground(bg.value);
                  setPanel(null);
                }}
                style={({ pressed }) => [styles.bgSwatch, { backgroundColor: bg.preview, opacity: pressed ? 0.7 : 1 }]}
              />
            ))}
          </View>
        </ScrollView>
      </Sheet>

      <Sheet open={panel === 'text'} onClose={finishText} title="Text">
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <TextField
            label="Your words"
            value={draftText}
            onChangeText={setDraftText}
            placeholder="New PR, done before breakfast"
            autoFocus
            maxLength={80}
            returnKeyType="done"
            onSubmitEditing={finishText}
            helper="Up to 80 characters. Long text shrinks to fit."
          />
          <Button label="Done" fullWidth onPress={finishText} />
        </View>
      </Sheet>

      <Sheet open={panel === 'layers'} onClose={() => setPanel(null)} title="Layers">
        <LayersList
          elements={doc.elements}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setPanel(null);
          }}
          onMove={(id, dir) => setDoc((d) => moveElement(d, id, dir))}
          onDelete={(id) => {
            setDoc((d) => removeElement(d, id));
            if (id === selectedId) setSelectedId(null);
          }}
        />
      </Sheet>

      <Sheet open={panel === 'colour'} onClose={() => setPanel(null)} title="Sticker colour">
        <Swatches value={selected?.colour ?? '#FFFFFF'} onChange={setColour} />
      </Sheet>
    </View>
  );
}

const BACKGROUNDS: { name: string; preview: string; value: Background }[] = [
  { name: 'Night', preview: '#151517', value: { kind: 'gradient', from: '#1C1C1F', to: '#0A0A0B' } },
  { name: 'Tide', preview: '#0F3F39', value: { kind: 'gradient', from: '#145A51', to: '#061614' } },
  { name: 'Black', preview: '#000000', value: { kind: 'solid', colour: '#000000' } },
  { name: 'Chalk', preview: '#EDEBE6', value: { kind: 'solid', colour: '#EDEBE6' } },
  { name: 'Forest', preview: '#1F3B2D', value: { kind: 'gradient', from: '#2E5641', to: '#13241B' } },
  { name: 'Dusk', preview: '#3A2A4A', value: { kind: 'gradient', from: '#5A3E6E', to: '#1D1426' } },
  { name: 'Ember', preview: '#7A2E1C', value: { kind: 'gradient', from: '#B5462A', to: '#3B150C' } },
];

function TemplateSheet({
  open,
  onClose,
  onPick,
  onAddText,
  activity,
  units,
  fonts,
  style,
  totals,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (id: string) => void;
  onAddText: () => void;
  activity: Activity;
  units: Units;
  fonts: TemplateFonts;
  style: Style;
  totals: Record<Period, Totals>;
}) {
  const [tab, setTab] = useState<'activity' | 'totals' | 'gear'>('activity');
  const { width } = useWindowDimensions();
  const gridWidth = Math.min(width, 560) - 16 * 2;
  const list = useMemo(() => TEMPLATES.filter((t) => t.category === tab), [tab]);

  return (
    <Sheet open={open} onClose={onClose} title="Add a sticker" size="full">
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        <View style={{ flexDirection: 'row' }}>
          <Chip label="Text" icon={Type} onPress={onAddText} />
        </View>
        <SegmentedTabs
          accessibilityLabel="Sticker type"
          items={[
            { key: 'activity', label: 'Activity' },
            { key: 'totals', label: 'Totals' },
            { key: 'gear', label: 'Gear' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>
      {list.length === 0 ? (
        <EmptyState icon={Plus} title="Coming soon" body="Gear stickers for your shoes and bikes are on the way." />
      ) : (
        <ScrollView contentContainerStyle={styles.tileGrid}>
          <TemplateGrid templates={list} activity={activity} units={units} fonts={fonts[style.font]} width={gridWidth} onPick={onPick} totals={totals} />
        </ScrollView>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, height: 56 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: 12 },
  canvasWrap: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface },
  rail: { position: 'absolute', right: 8, top: 12, gap: 10 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, height: 72 },
  bgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  bgSwatch: { width: 64, height: 112, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  tileGrid: { padding: 16, alignItems: 'center' },
});
