import { drawAsImage, ImageFormat } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { isAvailableAsync, shareAsync } from 'expo-sharing';

import { CANVAS } from '@/domain/composition';

import { Scene, type SceneProps } from './Scene';

export class PhotosPermissionError extends Error {}

/** Render the story offscreen at full 1080 x 1920 and write it to a PNG in the cache. Returns its URI. */
export async function renderStory(props: SceneProps): Promise<string> {
  const image = await drawAsImage(<Scene {...props} selectedId={null} />, { width: CANVAS.w, height: CANVAS.h });
  if (!image) throw new Error('Could not draw the story.');
  const file = new File(Paths.cache, `story-${Date.now()}.png`);
  file.create({ overwrite: true });
  file.write(image.encodeToBytes(ImageFormat.PNG, 100));
  return file.uri;
}

/** Save to the camera roll. Asks for add-only access the first time. */
export async function saveToPhotos(uri: string): Promise<void> {
  const { granted } = await requestPermissionsAsync(true, ['photo']);
  if (!granted) throw new PhotosPermissionError('Allow photo access in Settings to save stories.');
  await Asset.create(uri);
}

/** Save a PNG given as base64 (a sticker) to Photos. */
export async function savePngToPhotos(base64: string): Promise<void> {
  const file = new File(Paths.cache, `sticker-${Date.now()}.png`);
  file.create({ overwrite: true });
  file.write(base64, { encoding: 'base64' });
  await saveToPhotos(file.uri);
}

/** Open the system share sheet (Instagram, Messages, AirDrop...). */
export async function shareStory(uri: string): Promise<void> {
  if (!(await isAvailableAsync())) throw new Error('Sharing isn’t available on this device.');
  await shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share your story' });
}
