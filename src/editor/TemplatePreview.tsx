import { Canvas, Group, RoundedRect } from '@shopify/react-native-skia';
import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Period, Totals } from '@/domain/totals';
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
  totals,
  colour = colors.text,
  onLongPress,
  copiedId,
  hint,
}: {
  templates: TemplateDef[];
  activity: Activity;
  units: Units;
  totals?: Record<Period, Totals>;
  fonts: FontPair;
  width: number;
  onPick: (id: string) => void;
  /** sticker colour (the copy page shows stickers in the colour they'll be copied in) */
  colour?: string;
  onLongPress?: (id: string) => void;
  /** shows a tick on the tile that was just copied */
  copiedId?: string | null;
  /** spoken action, e.g. "Copy" (default "Add") */
  hint?: string;
}) {
  // dark stickers need a light tile to be visible
  const tileBg = isDark(colour) ? '#E7E7EA' : colors.surfaceRaised;
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
              <RoundedRect x={x} y={y} width={tile} height={tile} r={radius.md} color={tileBg} />
              <Group
                opacity={disabled ? 0.3 : 1}
                transform={[
                  { translateX: x + (tile - t.size.w * k) / 2 },
                  { translateY: y + (tile - t.size.h * k) / 2 },
                  { scale: k },
                ]}>
                <Shapes shapes={t.render({ activity, units, totals })} fonts={fonts} colour={colour} />
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
            onLongPress={onLongPress ? () => onLongPress(t.id) : undefined}
            copied={copiedId === t.id}
            verb={hint ?? 'Add'}
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
  onLongPress,
  copied,
  verb,
}: {
  left: number;
  top: number;
  size: number;
  label: string;
  reason: string | null;
  onPress: () => void;
  onLongPress?: () => void;
  copied: boolean;
  verb: string;
}) {
  const { pressableProps, focused } = usePressable(onPress, true);
  return (
    <View style={{ position: 'absolute', left, top, width: size }}>
      <Pressable
        {...pressableProps}
        disabled={!!reason}
        onLongPress={onLongPress}
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityLabel={reason ? `${label}, unavailable: ${reason}` : `${verb} ${label}`}
        accessibilityHint={onLongPress && !reason ? 'Press and hold to save to Photos' : undefined}
        accessibilityState={{ disabled: !!reason }}
        style={({ pressed }) => [
          { width: size, height: size, borderRadius: radius.md },
          pressed && !reason && styles.pressed,
          focused && focusRing,
        ]}>
        {copied ? (
          <View style={styles.badge}>
            <Check size={14} color={colors.onAccent} strokeWidth={3} />
          </View>
        ) : null}
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
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/** Relative luminance under ~0.2: treat as a dark colour. */
function isDark(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const ch = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
  return l < 0.2;
}
