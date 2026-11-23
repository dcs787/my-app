import { useTypeface, type SkTypeface } from '@shopify/react-native-skia';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { FontId } from '@/domain/composition';

/** Each template font has a display face (numbers, titles) and a text face (labels). All OFL-licensed. */
export type FontPair = {
  value: SkTypeface;
  label: SkTypeface;
  /** for scripts the face lacks (Arabic), used with shaped text */
  fallback?: SkTypeface;
};
export type TemplateFonts = Record<FontId, FontPair>;

export const FONT_NAMES: Record<FontId, string> = {
  inter: 'Clean',
  display: 'Heavy',
  serif: 'Serif',
  mono: 'Mono',
  condensed: 'Tall',
};

const FILES = {
  inter600: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
  inter800: require('@expo-google-fonts/inter/800ExtraBold/Inter_800ExtraBold.ttf'),
  archivo: require('@expo-google-fonts/archivo-black/400Regular/ArchivoBlack_400Regular.ttf'),
  serif: require('@expo-google-fonts/instrument-serif/400Regular/InstrumentSerif_400Regular.ttf'),
  serifItalic: require('@expo-google-fonts/instrument-serif/400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf'),
  mono500: require('@expo-google-fonts/jetbrains-mono/500Medium/JetBrainsMono_500Medium.ttf'),
  mono800: require('@expo-google-fonts/jetbrains-mono/800ExtraBold/JetBrainsMono_800ExtraBold.ttf'),
  oswald500: require('@expo-google-fonts/oswald/500Medium/Oswald_500Medium.ttf'),
  oswald700: require('@expo-google-fonts/oswald/700Bold/Oswald_700Bold.ttf'),
  arabic: require('@expo-google-fonts/noto-sans-arabic/600SemiBold/NotoSansArabic_600SemiBold.ttf'),
};

const FontsContext = createContext<TemplateFonts | null>(null);

/** Loads the template typefaces once. Children get `null` from useTemplateFonts() until they're ready. */
export function TemplateFontsProvider({ children }: { children: ReactNode }) {
  const inter600 = useTypeface(FILES.inter600);
  const inter800 = useTypeface(FILES.inter800);
  const archivo = useTypeface(FILES.archivo);
  const serif = useTypeface(FILES.serif);
  const serifItalic = useTypeface(FILES.serifItalic);
  const mono500 = useTypeface(FILES.mono500);
  const mono800 = useTypeface(FILES.mono800);
  const oswald500 = useTypeface(FILES.oswald500);
  const oswald700 = useTypeface(FILES.oswald700);
  const arabic = useTypeface(FILES.arabic);

  const fonts = useMemo<TemplateFonts | null>(() => {
    if (!inter600 || !inter800 || !archivo || !serif || !serifItalic || !mono500 || !mono800 || !oswald500 || !oswald700 || !arabic) {
      return null;
    }
    return {
      inter: { value: inter800, label: inter600, fallback: arabic },
      display: { value: archivo, label: inter600, fallback: arabic },
      serif: { value: serifItalic, label: serif, fallback: arabic },
      mono: { value: mono800, label: mono500, fallback: arabic },
      condensed: { value: oswald700, label: oswald500, fallback: arabic },
    };
  }, [inter600, inter800, archivo, serif, serifItalic, mono500, mono800, oswald500, oswald700, arabic]);

  return <FontsContext.Provider value={fonts}>{children}</FontsContext.Provider>;
}

export const useTemplateFonts = () => useContext(FontsContext);
