import { Linking, Platform } from 'react-native';

/**
 * Direct share to Instagram Stories (the story opens in Instagram's editor,
 * ready to post). Needs a Meta app id (EXPO_PUBLIC_META_APP_ID, see
 * SETUP.md) and react-native-share's native module, so it's loaded lazily:
 * Expo Go and unconfigured builds fall back to the share sheet.
 */
export const META_APP_ID = process.env.EXPO_PUBLIC_META_APP_ID ?? '';

type ShareModule = typeof import('react-native-share');

function load(): ShareModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-share');
  } catch {
    return null;
  }
}

export async function canShareToInstagram(): Promise<boolean> {
  if (Platform.OS !== 'ios' || !META_APP_ID || !load()) return false;
  try {
    return await Linking.canOpenURL('instagram-stories://share');
  } catch {
    return false;
  }
}

/** Opens Instagram with the image as the story background. */
export async function shareToInstagramStory(pngUri: string): Promise<void> {
  const mod = load();
  if (!mod || !META_APP_ID) throw new Error('Instagram sharing isn’t set up in this build.');
  const Share = mod.default;
  await Share.shareSingle({
    social: mod.Social.InstagramStories,
    appId: META_APP_ID,
    backgroundImage: pngUri,
  });
}
