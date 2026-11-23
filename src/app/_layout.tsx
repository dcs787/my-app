import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { DarkTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorScreen } from '@/components/ErrorScreen';
import { StoreProvider } from '@/data';
import { HealthObserver } from '@/features/HealthObserver';
import { colors, fontFamily } from '@/theme';
import { ToastProvider } from '@/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};

/** Anything else that crashes lands here instead of a blank screen. */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorScreen {...props} />;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  // Fonts must be ready before anything renders: the editor's export depends on them.
  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <ThemeProvider value={navTheme}>
          <StoreProvider>
            <ToastProvider>
              <HealthObserver />
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: colors.bg },
                  headerTintColor: colors.text,
                  headerTitleStyle: { fontFamily: fontFamily('600') },
                  contentStyle: { backgroundColor: colors.bg },
                  headerShadowVisible: false,
                }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="activities/new" options={{ title: 'Add an activity', presentation: 'modal' }} />
                <Stack.Screen name="activities/[id]" options={{ title: 'Activity' }} />
                <Stack.Screen name="edit/[activityId]" options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
                <Stack.Screen name="stickers/[activityId]" options={{ title: 'Copy stickers' }} />
                <Stack.Screen name="help" options={{ title: 'Help' }} />
                <Stack.Screen name="design" options={{ title: 'Design system' }} />
              </Stack>
            </ToastProvider>
          </StoreProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
