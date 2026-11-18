import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/theme';

/**
 * Web: Skia runs on CanvasKit (WebAssembly). The editor module, and everything
 * that touches Skia, is imported only after CanvasKit has loaded.
 */
export function EditorHost({ activityId }: { activityId: string }) {
  return (
    <WithSkiaWeb
      opts={{ locateFile: (file: string) => `/${file}` }}
      getComponent={() => import('./EditorScreen')}
      componentProps={{ activityId }}
      fallback={
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
          <ActivityIndicator color={colors.text} />
        </View>
      }
    />
  );
}
