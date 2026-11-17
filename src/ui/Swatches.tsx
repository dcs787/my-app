import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';

import { usePressable } from './usePressable';

/**
 * Placeholder palette for text/sticker colours. replica-brand replaces the
 * hues; white and black stay.
 */
export const DEFAULT_SWATCHES = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Black', value: '#000000' },
  { name: 'Stone', value: '#D6D3D1' },
  { name: 'Volt', value: '#D9F99D' },
  { name: 'Lime', value: '#84CC16' },
  { name: 'Teal', value: '#2DD4BF' },
  { name: 'Sky', value: '#7DD3FC' },
  { name: 'Orange', value: '#FB923C' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Gold', value: '#FACC15' },
] as const;

export type SwatchesProps = {
  value: string;
  onChange: (hex: string) => void;
  swatches?: readonly { name: string; value: string }[];
};

export function Swatches({ value, onChange, swatches = DEFAULT_SWATCHES }: SwatchesProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole="radiogroup">
      {swatches.map((s) => (
        <Swatch
          key={s.value}
          name={s.name}
          hex={s.value}
          selected={s.value.toLowerCase() === value.toLowerCase()}
          onPress={() => onChange(s.value)}
        />
      ))}
    </ScrollView>
  );
}

function Swatch({ name, hex, selected, onPress }: { name: string; hex: string; selected: boolean; onPress: () => void }) {
  const { pressableProps, stateStyle } = usePressable(onPress, true);
  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="radio"
      accessibilityLabel={name}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.hit, stateStyle(pressed)]}>
      <View style={[styles.ring, selected && { borderColor: colors.accent }]}>
        <View style={[styles.dot, { backgroundColor: hex }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { gap: 4, paddingHorizontal: 12 },
  hit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  ring: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 30, height: 30, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
});
