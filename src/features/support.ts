import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '';

/**
 * A pre-filled email to support. Nothing is sent unless the person sends it
 * from their mail app, so the App Store label "Data Not Collected" stays true.
 */
export function supportMailUrl(subject: string, details?: string): string {
  const version = Constants.expoConfig?.version ?? '';
  const body = `\n\n${details ? `${details}\n` : ''}—\nMileprint ${version} · ${Platform.OS} ${String(Platform.Version)}`;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
