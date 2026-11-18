import { Canvas, Group, RoundedRect } from '@shopify/react-native-skia';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Activity, Units } from '@/domain/types';
import { colors, focusRing, radius } from '@/theme';
import { Text } from '@/ui';
import { usePressable } from '@/ui/usePressable';

import type { FontPair } from './fonts';
import { Shapes } from './Scene';
import { unavailableReason, type TemplateDef } from './templates';

const GAP = 12;
const LABEL_H = 40;

/**
 * Every template preview drawn on ONE Skia canvas, with invisible buttons laid
 * over the tiles for touch and screen readers. One GPU surface instead of one
 * per tile: browsers drop canvases past ~16 WebGL contexts, and on iPhone each
 * canvas is its own Metal layer.
 */
export function TemplateGrid({
  templates,
  activity,
  units,
  fonts,
  width,
  onPick,
}: {
  templates: TemplateDef[];
  activity: Activity;
  units: Units;
  fonts: FontPair;
  width: number;
  onPick: (id: string) => void;
}) {
  const tile = Math.floor((width - GAP) / 2);
  const rows = Math.ceil(templates.length / 2);
  const rowH = tile + LABEL_H + GAP;
  const pos = (i: number) => ({ x: (i % 2) * (tile + GAP), y: Math.floor(i / 2) * rowH });

  return (
    <View style={{ width, height: rows * rowH }}>
      <Canvas style={{ width, height: rows * rowH }} pointerEvents="none">
        {templates.map((t, i) => {
          const { x, y } = pos(i);
          const k = Math.min(tile / t.size.w, tile / t.size.h) * 0.86;
          const disabled = unavailableReason(t, activity) != null;
          return (
            <Group key={t.id}>
              <RoundedRect x={x} y={y} width={tile} height={tile} r={radius.md} color={colors.surfaceRaised} />
              <Group
                opacity={disabled ? 0.3 : 1}
                transform={[
                  { translateX: x + (tile - t.size.w * k) / 2 },
                  { translateY: y + (tile - t.size.h * k) / 2 },
                  { scale: k },
                ]}>
                <Shapes shapes={t.render({ activity, units })} fonts={fonts} colour={colors.text} />
              </Group>
            </Group>
          );
        })}
      </Canvas>
      {templates.map((t, i) => {
        const { x, y } = pos(i);
        return (
          <TileButton
            key={t.id}
            left={x}
            top={y}
            size={tile}
            label={t.name}
            reason={unavailableReason(t, activity)}
            onPress={() => onPick(t.id)}
          />
        );
      })}
    </View>
  );
}

function TileButton({
  left,
  top,
  size,
  label,
  reason,
  onPress,
}: {
  left: number;
  top: number;
  size: number;
  label: string;
  reason: string | null;
  onPress: () => void;
}) {
  const { pressableProps, focused } = usePressable(onPress, true);
  return (
    <View style={{ position: 'absolute', left, top, width: size }}>
      <Pressable
        {...pressableProps}
        disabled={!!reason}
        accessibilityRole="button"
        accessibilityLabel={reason ? `${label}, unavailable: ${reason}` : `Add ${label}`}
        accessibilityState={{ disabled: !!reason }}
        style={({ pressed }) => [
          { width: size, height: size, borderRadius: radius.md },
          pressed && !reason && styles.pressed,
          focused && focusRing,
        ]}>
        {reason ? (
          <View style={styles.reason}>
            <Text variant="caption" weight="600" color="textMuted">
              {reason}
            </Text>
          </View>
        ) : null}
      </Pressable>
      <Text variant="caption" color="textMuted" align="center" numberOfLines={1} style={{ marginTop: 6 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { backgroundColor: 'rgba(255,255,255,0.08)' },
  reason: { position: 'absolute', bottom: 10, left: 0, right: 0, alignItems: 'center' },
});
