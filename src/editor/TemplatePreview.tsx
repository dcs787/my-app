import { Canvas, Group } from '@shopify/react-native-skia';

import type { Activity, Units } from '@/domain/types';

import type { FontPair } from './fonts';
import { Shapes } from './Scene';
import type { TemplateDef } from './templates';

/** A template drawn small, fitted and centred in a square tile. */
export function TemplatePreview({
  template,
  activity,
  units,
  fonts,
  colour,
  size,
}: {
  template: TemplateDef;
  activity: Activity;
  units: Units;
  fonts: FontPair;
  colour: string;
  size: number;
}) {
  const k = Math.min(size / template.size.w, size / template.size.h) * 0.88;
  const dx = (size - template.size.w * k) / 2;
  const dy = (size - template.size.h * k) / 2;
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Group transform={[{ translateX: dx }, { translateY: dy }, { scale: k }]}>
        <Shapes shapes={template.render({ activity, units })} fonts={fonts} colour={colour} />
      </Group>
    </Canvas>
  );
}
