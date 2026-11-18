import { drawAsImage, Group, ImageFormat } from '@shopify/react-native-skia';
import { setImageAsync } from 'expo-clipboard';

import type { FontPair } from './fonts';
import { Shapes } from './Scene';
import type { TemplateDef, TemplateInput } from './templates';

/** Sticker PNGs are rendered at 2x their natural size: crisp when pinched up in Instagram. */
const SCALE = 2;

/** One sticker on a transparent background, as base64 PNG (no data: prefix). */
export async function renderStickerBase64(t: TemplateDef, input: TemplateInput, fonts: FontPair, colour: string): Promise<string> {
  const image = await drawAsImage(
    <Group transform={[{ scale: SCALE }]}>
      <Shapes shapes={t.render(input)} fonts={fonts} colour={colour} />
    </Group>,
    { width: t.size.w * SCALE, height: t.size.h * SCALE },
  );
  if (!image) throw new Error('Could not draw the sticker.');
  return image.encodeToBase64(ImageFormat.PNG, 100);
}

export async function copyStickerToClipboard(base64: string): Promise<void> {
  await setImageAsync(base64);
}
