import { drawAsImage, ImageFormat } from '@shopify/react-native-skia';

import { CANVAS } from '@/domain/composition';

import { Scene, type SceneProps } from './Scene';

// Web is a preview target: the same render, delivered as a download.

export class PhotosPermissionError extends Error {}

export async function renderStory(props: SceneProps): Promise<string> {
  const image = await drawAsImage(<Scene {...props} selectedId={null} />, { width: CANVAS.w, height: CANVAS.h });
  if (!image) throw new Error('Could not draw the story.');
  return `data:image/png;base64,${image.encodeToBase64(ImageFormat.PNG, 100)}`;
}

export async function saveToPhotos(uri: string): Promise<void> {
  const a = document.createElement('a');
  a.href = uri;
  a.download = `story-${Date.now()}.png`;
  a.click();
}

export async function shareStory(uri: string): Promise<void> {
  const blob = await (await fetch(uri)).blob();
  const file = new window.File([blob], 'story.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
  } else {
    await saveToPhotos(uri);
  }
}
