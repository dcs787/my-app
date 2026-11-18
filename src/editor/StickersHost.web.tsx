import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/theme';

/** Web: load the Skia-based page only after CanvasKit is ready (same as the editor). */
export function StickersHost({ activityId }: { activityId: string }) {
  return (
    <WithSkiaWeb
      opts={{ locateFile: (file: string) => `/${file}` }}
      getComponent={() => import('./StickersScreen')}
      componentProps={{ activityId }}
      fallback={
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
          <ActivityIndicator color={colors.text} />
        </View>
      }
    />
  );
}
