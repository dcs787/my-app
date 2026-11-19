import type { LucideIcon } from 'lucide-react-native';
import { Platform, Pressable, View, type GestureResponderEvent } from 'react-native';

import { colors, radius } from '@/theme';

import { Text } from './Text';
import { usePressable } from './usePressable';

type Variant = 'action' | 'toggle' | 'tag';

export type ChipProps = {
  label: string;
  variant?: Variant;
  icon?: LucideIcon;
  selected?: boolean;
  disabled?: boolean;
  onPress?: (e: GestureResponderEvent) => void;
};

export function Chip({ label, variant = 'action', icon: Icon, selected = false, disabled, onPress }: ChipProps) {
  const { pressableProps, stateStyle } = usePressable(onPress, variant === 'toggle');
  const on = variant === 'toggle' && selected;
  const fg = on ? colors.onAccent : colors.text;
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {Icon && <Icon size={14} color={fg} strokeWidth={2.25} />}
      <Text variant="caption" weight="600" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
  const box = {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    justifyContent: 'center' as const,
    backgroundColor: variant === 'tag' ? 'transparent' : on ? colors.accent : colors.surfaceRaised,
    borderWidth: variant === 'tag' ? 1 : 0,
    borderColor: colors.border,
  };

  if (variant === 'tag') {
    return <View style={box}>{body}</View>;
  }
  return (
    <Pressable
      {...pressableProps}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole={variant === 'toggle' && Platform.OS !== 'web' ? 'togglebutton' : 'button'}
      // react-native-web has no toggle role: a button with aria-pressed is the web equivalent
      {...(variant === 'toggle' && Platform.OS === 'web' ? ({ 'aria-pressed': selected } as object) : {})}
      accessibilityLabel={label}
      aria-disabled={!!disabled}
      // iOS reads the selected state; web uses aria-pressed (above), the right state for a toggle button
      aria-selected={variant === 'toggle' && Platform.OS !== 'web' ? selected : undefined}
      style={({ pressed }) => [box, stateStyle(pressed, disabled)]}>
      {body}
    </Pressable>
  );
}
