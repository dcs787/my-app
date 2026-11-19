import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';

import { Text } from './Text';
import { usePressable } from './usePressable';

export type TabItem<K extends string> = { key: K; label: string };

export type SegmentedTabsProps<K extends string> = {
  items: readonly TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  variant?: 'underline' | 'pill';
  accessibilityLabel?: string;
};

export function SegmentedTabs<K extends string>({
  items,
  value,
  onChange,
  variant = 'underline',
  accessibilityLabel,
}: SegmentedTabsProps<K>) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={variant === 'underline' ? styles.underlineRow : styles.pillRow}>
      {items.map((item) => (
        <Tab
          key={item.key}
          label={item.label}
          selected={item.key === value}
          variant={variant}
          onPress={() => onChange(item.key)}
        />
      ))}
    </View>
  );
}

function Tab({
  label,
  selected,
  variant,
  onPress,
}: {
  label: string;
  selected: boolean;
  variant: 'underline' | 'pill';
  onPress: () => void;
}) {
  const { pressableProps, stateStyle } = usePressable(onPress, true);
  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="tab"
      aria-selected={selected}
      accessibilityLabel={label}
      style={({ pressed }) => [
        variant === 'underline' ? styles.underlineTab : styles.pillTab,
        variant === 'pill' && selected && { backgroundColor: colors.surfaceRaised },
        stateStyle(pressed),
      ]}>
      <Text variant="sm" weight={selected ? '600' : '500'} color={selected ? 'text' : 'textMuted'}>
        {label}
      </Text>
      {variant === 'underline' && <View style={[styles.bar, selected && styles.barOn]} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  underlineRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  underlineTab: { flex: 1, alignItems: 'center', paddingTop: 12, minHeight: 44 },
  bar: { marginTop: 10, height: 2, alignSelf: 'stretch', marginHorizontal: 12, borderRadius: 1 },
  barOn: { backgroundColor: colors.accent },
  pillRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  pillTab: {
    flex: 1,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
