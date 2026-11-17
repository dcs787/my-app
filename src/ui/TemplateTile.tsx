import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';

import { Text } from './Text';
import { usePressable } from './usePressable';

export type TemplateTileProps = {
  /** Accessible name, e.g. "Distance and pace". */
  label: string;
  /** Live preview of the template. */
  children: ReactNode;
  onPress?: () => void;
  /** Why the template can't be used with this activity, e.g. "No route". Disables the tile. */
  unavailableReason?: string;
  copied?: boolean;
};

export function TemplateTile({ label, children, onPress, unavailableReason, copied }: TemplateTileProps) {
  const disabled = !!unavailableReason;
  const { pressableProps, stateStyle } = usePressable(onPress, true);
  return (
    <View style={styles.wrap}>
      <Pressable
        {...pressableProps}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={disabled ? `${label}, unavailable: ${unavailableReason}` : label}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [styles.tile, stateStyle(pressed), disabled && { opacity: 0.35 }]}>
        {children}
        {copied && (
          <View style={styles.badge}>
            <Check size={14} color={colors.onAccent} strokeWidth={3} />
          </View>
        )}
      </Pressable>
      {disabled && (
        <Text variant="caption" color="textMuted" align="center" style={{ marginTop: 4 }}>
          {unavailableReason}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  tile: {
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 12,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
