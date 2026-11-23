import { ChevronRight, type LucideIcon } from '@/ui/icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';

import { Text } from './Text';
import { usePressable } from './usePressable';

export type ListRowProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  trailing?: string;
  onPress?: () => void;
  /** Full spoken label, e.g. "Morning run, 6.2 miles, Tuesday". Defaults to the visible text. */
  accessibilityLabel?: string;
};

export function ListRow({ icon: Icon, title, subtitle, trailing, onPress, accessibilityLabel }: ListRowProps) {
  const { pressableProps, stateStyle } = usePressable(onPress);
  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, trailing, subtitle].filter(Boolean).join(', ')}
      style={({ pressed }) => [styles.row, stateStyle(pressed)]}>
      <View style={styles.icon}>
        <Icon size={20} color={colors.text} strokeWidth={2} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="base" weight="600" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" color="textMuted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? (
        <Text variant="sm" weight="600">
          {trailing}
        </Text>
      ) : null}
      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
