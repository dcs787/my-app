import type { LucideIcon } from '@/ui/icons';
import { ActivityIndicator, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { colors, radius, type ColorRole } from '@/theme';

import { Text } from './Text';
import { usePressable } from './usePressable';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variantStyle: Record<Variant, { bg?: ColorRole; fg: ColorRole }> = {
  primary: { bg: 'accent', fg: 'onAccent' },
  secondary: { bg: 'surfaceRaised', fg: 'text' },
  ghost: { fg: 'text' },
  danger: { bg: 'surfaceRaised', fg: 'danger' },
};

const sizeStyle: Record<Size, { height: number; padX: number; icon: number }> = {
  sm: { height: 32, padX: 12, icon: 16 },
  md: { height: 44, padX: 16, icon: 18 },
  lg: { height: 52, padX: 20, icon: 20 },
};

export type ButtonProps = {
  label: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityHint,
}: ButtonProps) {
  const v = variantStyle[variant];
  const s = sizeStyle[size];
  const inactive = disabled || loading;
  const { pressableProps, stateStyle } = usePressable(onPress, variant === 'primary');

  return (
    <Pressable
      {...pressableProps}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      aria-disabled={inactive}
      aria-busy={loading}
      // keep a 44pt hit area for the small size
      hitSlop={size === 'sm' ? 6 : undefined}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.padX,
          backgroundColor: v.bg ? colors[v.bg] : 'transparent',
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        stateStyle(pressed, disabled),
      ]}>
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator size="small" color={colors[v.fg]} />
        ) : (
          Icon && <Icon size={s.icon} color={colors[v.fg]} strokeWidth={2.25} />
        )}
        <Text variant={size === 'lg' ? 'base' : 'sm'} weight="600" color={v.fg} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
