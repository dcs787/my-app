import { ChevronDown, ChevronUp, Trash } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { CanvasElement } from '@/domain/composition';
import { colors, radius } from '@/theme';
import { IconButton, Text } from '@/ui';
import { usePressable } from '@/ui/usePressable';

import { FONT_NAMES } from './fonts';
import { templateById, TEXT_TEMPLATE_ID } from './templates';

/**
 * Every sticker, front-most first: select, reorder, delete. The keyboard and
 * screen-reader way to manage the canvas, and handy when stickers overlap.
 */
export function LayersList({
  elements,
  selectedId,
  onSelect,
  onMove,
  onDelete,
}: {
  elements: CanvasElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
  onDelete: (id: string) => void;
}) {
  if (!elements.length) {
    return (
      <Text variant="sm" color="textMuted" align="center" style={{ padding: 24 }}>
        No stickers yet. Add one with the + button.
      </Text>
    );
  }
  const frontFirst = [...elements].reverse();
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
      {frontFirst.map((el, i) => (
        <Row
          key={el.id}
          element={el}
          selected={el.id === selectedId}
          isFront={i === 0}
          isBack={i === frontFirst.length - 1}
          onSelect={() => onSelect(el.id)}
          onMove={(dir) => onMove(el.id, dir)}
          onDelete={() => onDelete(el.id)}
        />
      ))}
    </ScrollView>
  );
}

export function layerName(el: CanvasElement): string {
  if (el.templateId === TEXT_TEMPLATE_ID) return el.text ? `“${el.text}”` : 'Text';
  return templateById(el.templateId)?.name ?? 'Sticker';
}

function Row({
  element,
  selected,
  isFront,
  isBack,
  onSelect,
  onMove,
  onDelete,
}: {
  element: CanvasElement;
  selected: boolean;
  isFront: boolean;
  isBack: boolean;
  onSelect: () => void;
  onMove: (dir: 'up' | 'down') => void;
  onDelete: () => void;
}) {
  const name = layerName(element);
  const { pressableProps, stateStyle } = usePressable(onSelect, true);
  return (
    <View style={[styles.row, selected && styles.selected]}>
      <Pressable
        {...pressableProps}
        accessibilityRole="button"
        accessibilityLabel={`${name}${selected ? ', selected' : ''}. Select`}
        accessibilityState={{ selected }}
        style={({ pressed }) => [styles.name, stateStyle(pressed)]}>
        <View style={[styles.swatch, { backgroundColor: element.colour }]} />
        <View style={{ flex: 1 }}>
          <Text variant="sm" weight="600" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" color="textMuted">
            {FONT_NAMES[element.font]}
          </Text>
        </View>
      </Pressable>
      <IconButton icon={ChevronUp} label={`Move ${name} forward`} variant="plain" size={36} disabled={isFront} onPress={() => onMove('up')} />
      <IconButton icon={ChevronDown} label={`Move ${name} back`} variant="plain" size={36} disabled={isBack} onPress={() => onMove('down')} />
      <IconButton icon={Trash} label={`Delete ${name}`} variant="plain" size={36} onPress={onDelete} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selected: { borderColor: colors.accent },
  name: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 56 },
  swatch: { width: 20, height: 20, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
});
