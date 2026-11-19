import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';

import { usePressable } from './usePressable';

/** Sticker colours: white and black first, then Mileprint teal and amber, then a few that read well on photos. */
export const DEFAULT_SWATCHES = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Black', value: '#000000' },
  { name: 'Mileprint teal', value: '#3EE0C5' },
  { name: 'Amber', value: '#FFC24D' },
  { name: 'Chalk', value: '#EDEBE6' },
  { name: 'Lime', value: '#C5F25A' },
  { name: 'Sky', value: '#8FD3FF' },
  { name: 'Coral', value: '#FF7A6B' },
  { name: 'Lilac', value: '#C9B6FF' },
  { name: 'Stone', value: '#A8A29E' },
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
      aria-checked={selected}
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
