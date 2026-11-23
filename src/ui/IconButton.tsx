import type { LucideIcon } from '@/ui/icons';
import { Pressable, type GestureResponderEvent } from 'react-native';

import { colors, radius } from '@/theme';

import { usePressable } from './usePressable';

type Variant = 'overlay' | 'plain' | 'solid';

export type IconButtonProps = {
  icon: LucideIcon;
  /** Required: icon buttons have no visible label. */
  label: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: Variant;
  size?: 36 | 44;
  selected?: boolean;
  disabled?: boolean;
};

const bg: Record<Variant, string> = {
  overlay: 'rgba(43,43,46,0.72)', // overlay token at 72% so photos show through
  plain: 'transparent',
  solid: colors.surfaceRaised,
};

export function IconButton({
  icon: Icon,
  label,
  onPress,
  variant = 'overlay',
  size = 44,
  selected = false,
  disabled = false,
}: IconButtonProps) {
  const { pressableProps, stateStyle } = usePressable(onPress);
  const pad = (44 - size) / 2;

  return (
    <Pressable
      {...pressableProps}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={!!disabled}
      aria-selected={selected}
      hitSlop={pad > 0 ? pad : undefined}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg[variant],
        },
        selected && { borderWidth: 2, borderColor: colors.accent },
        stateStyle(pressed, disabled),
      ]}>
      <Icon size={size === 36 ? 18 : 20} color={colors.text} strokeWidth={2.25} />
    </Pressable>
  );
}
