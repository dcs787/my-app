import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { Platform } from 'react-native';

import type { Background } from '@/domain/composition';

/** Longest edge kept for backgrounds: 2x the canvas width is plenty and keeps memory low. */
const MAX_EDGE = 2160;

/** Pick a photo for the background, downscaled so a 48 MP photo doesn't exhaust memory. */
export async function pickBackgroundPhoto(): Promise<Extract<Background, { kind: 'photo' }> | null> {
  const res = await launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: false });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  let photo = { uri: a.uri, width: a.width, height: a.height };
  if (Math.max(a.width, a.height) > MAX_EDGE) {
    const ctx = ImageManipulator.manipulate(a.uri);
    ctx.resize(a.width >= a.height ? { width: MAX_EDGE, height: null } : { width: null, height: MAX_EDGE });
    const ref = await ctx.renderAsync();
    photo = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
  }
  return { kind: 'photo', ...photo, uri: keep(photo.uri) };
}

/** The picker hands back a cache file the OS may clear; keep our own copy so saved designs reopen. */
function keep(uri: string): string {
  if (Platform.OS === 'web') return uri;
  const dir = new Directory(Paths.document, 'backgrounds');
  if (!dir.exists) dir.create({ intermediates: true });
  const ext = uri.split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpg';
  const dest = new File(dir, `${Date.now()}.${ext}`);
  new File(uri).copy(dest);
  return dest.uri;
}
